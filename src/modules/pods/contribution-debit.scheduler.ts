import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PodMembershipEntity } from './entities/pod-membership.entity';
import { PodEntity } from './entities/pod.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PaymentEntity } from '../finance/entities/payment.entity';
import { isSuccessfulPaymentStatus } from '../achievements/achievement.helpers';
import { CustomPodCadence } from './custom-pod-cadence.enum';
import {
  addDays,
  isWithinContributionWindow,
  nextContributionWindowStart,
  resolveContributionWindowStart,
  startOfDay,
} from './pod.utils';
import { RecordPaymentCommand } from '../finance/commands/record-payment.command';
import { PodType } from './pod-type.enum';

// const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily fallback
// const RUN_INTERVAL_MS = 60000; // every minute (debug)

@Injectable()
export class ContributionDebitScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ContributionDebitScheduler.name);
  private timer?: NodeJS.Timeout;
  private stripe: Stripe | null = null;
  private readonly currency: string;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
    private readonly configService: ConfigService,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {
    const secret =
      this.configService.get<string>('stripe.secretKey', { infer: true }) ?? '';
    const apiVersion =
      this.configService.get<string>('stripe.apiVersion', { infer: true }) ??
      '2024-06-20';
    this.currency =
      this.configService.get<string>('stripe.defaultCurrency', {
        infer: true,
      }) ?? 'usd';

    if (secret.trim().length) {
      this.stripe = new Stripe(secret, {
        apiVersion: apiVersion as Stripe.LatestApiVersion,
      });
    } else {
      this.logger.warn(
        'Stripe secret key not configured; auto-debits disabled.',
      );
    }
  }

  onModuleInit() {
    this.scheduleNextRun();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private scheduleNextRun(reference: Date = new Date()): void {
    const now = reference;
    const target = new Date(now);
    target.setUTCHours(10, 0, 0, 0); // 10 AM UTC

    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const delay = Math.max(target.getTime() - now.getTime(), 1_000);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      void this.execute()
        .catch((error) =>
          this.logger.error(
            `Contribution debit scheduler failed: ${(error as Error).message}`,
          ),
        )
        .finally(() => this.scheduleNextRun(new Date()));
    }, delay);
  }

  private async execute(): Promise<void> {
    if (!this.stripe) {
      return;
    }

    const reference = new Date();
    await RequestContext.create(this.orm.em, async () => {
      await this.processDueContributions(reference);
    });
  }

  private async processDueContributions(reference: Date): Promise<void> {
    const dayStart = startOfDay(reference);
    const dayEnd = addDays(dayStart, 1);

    const memberships = await this.membershipRepository.find(
      { account: { $ne: null } },
      { populate: ['pod', 'account'] as const },
    );

    for (const membership of memberships) {
      const pod = membership.pod;
      const account = membership.account;
      if (!pod || !account) {
        continue;
      }

      const cadence =
        pod.type === PodType.CUSTOM
          ? (pod.cadence ?? CustomPodCadence.BI_WEEKLY)
          : CustomPodCadence.BI_WEEKLY;

      const nextDate =
        pod.nextContributionDate ??
        this.computeFallbackNextContributionDate(pod, dayStart);

      if (
        !nextDate ||
        nextDate < dayStart ||
        nextDate >= dayEnd ||
        !isWithinContributionWindow(nextDate, cadence)
      ) {
        continue;
      }

      if (!account.stripeCustomerId || !account.stripePaymentMethodId) {
        continue;
      }

      const hasSuccess = await this.paymentRepository.count({
        membership,
        createdAt: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ['paid', 'succeeded', 'completed', 'success'] },
      });

      if (hasSuccess) {
        continue;
      }

      const hasPending = await this.paymentRepository.count({
        membership,
        status: { $in: ['processing', 'requires_action'] },
      });
      if (hasPending) {
        continue;
      }

      await this.chargeMembership(account, pod, membership, dayStart, cadence);
    }
  }

  private async chargeMembership(
    account: AccountEntity,
    pod: PodEntity,
    membership: PodMembershipEntity,
    windowStart: Date,
    cadence: CustomPodCadence,
  ): Promise<void> {
    try {
      const paymentMethod = await this.stripe!.paymentMethods.retrieve(
        account.stripePaymentMethodId!,
      );

      const bankStatus =
        (paymentMethod.us_bank_account as any)?.status ?? 'unknown';

      if (paymentMethod.type !== 'us_bank_account') {
        account.flagMissedPayment('payment_method_unverified');
        await this.accountRepository.getEntityManager().flush();
        this.logger.warn(
          `Payment method type not supported for auto-debit (account ${account.id}, pod ${pod.id}, type=${paymentMethod.type})`,
        );
        return;
      }

      this.logger.debug(
        `Attempting ACH debit for account ${account.id}, pod ${pod.id}, bankStatus=${bankStatus}, fca=${paymentMethod.us_bank_account?.financial_connections_account ?? 'n/a'}`,
      );

      const windowStartDay = startOfDay(windowStart);
      if (
        !isWithinContributionWindow(windowStartDay, cadence) ||
        addDays(windowStartDay, 3) <= windowStartDay
      ) {
        return;
      }

      const amountCents = Math.round(pod.amount * 100);
      const intent = await this.stripe!.paymentIntents.create({
        amount: amountCents,
        currency: this.currency,
        customer: account.stripeCustomerId!,
        payment_method: account.stripePaymentMethodId!,
        confirm: true,
        off_session: true,
        description: `Pod ${pod.planCode} contribution`,
        metadata: {
          podId: pod.id,
          membershipId: membership.id,
          accountId: account.id,
        },
      });

      if (isSuccessfulPaymentStatus(intent.status)) {
        await this.commandBus.execute(
          new RecordPaymentCommand(
            account.id,
            pod.id,
            intent.id,
            pod.amount,
            this.currency,
            intent.status,
            intent.description ?? 'auto-debit',
          ),
        );

        this.advanceNextContributionDate(pod);
        await this.podRepository.getEntityManager().flush();
        return;
      }

      if (
        intent.status === 'processing' ||
        intent.status === 'requires_action'
      ) {
        this.logger.debug(
          `PaymentIntent ${intent.id} for account ${account.id} is ${intent.status}; awaiting final status.`,
        );
        await this.recordPendingPayment(intent, pod, membership, account);
        return;
      }

      account.flagMissedPayment(`payment_status:${intent.status}`);
      await this.accountRepository.getEntityManager().flush();
    } catch (error) {
      this.logger.error(
        `Failed to auto-debit account ${account.id} for pod ${pod.id}: ${(error as Error).message}`,
      );
      this.logStripeError(error);
      account.flagMissedPayment('auto_debit_failed');
      await this.accountRepository.getEntityManager().flush();
    }
  }

  private computeFallbackNextContributionDate(
    pod: PodEntity,
    reference: Date,
  ): Date | null {
    const cadence =
      pod.type === PodType.CUSTOM
        ? (pod.cadence ?? CustomPodCadence.BI_WEEKLY)
        : CustomPodCadence.BI_WEEKLY;
    const today = startOfDay(reference);

    if (isWithinContributionWindow(today, cadence)) {
      return today;
    }

    return resolveContributionWindowStart(today, cadence);
  }

  private advanceNextContributionDate(pod: PodEntity): void {
    const cadence =
      pod.type === PodType.CUSTOM
        ? (pod.cadence ?? CustomPodCadence.BI_WEEKLY)
        : CustomPodCadence.BI_WEEKLY;
    const current =
      pod.nextContributionDate ?? pod.startDate ?? startOfDay(new Date());
    pod.nextContributionDate = nextContributionWindowStart(current, cadence);
  }

  private async recordPendingPayment(
    intent: Stripe.PaymentIntent,
    pod: PodEntity,
    membership: PodMembershipEntity,
    account: AccountEntity,
  ): Promise<void> {
    let payment = await this.paymentRepository.findOne({
      stripeReference: intent.id,
    });

    if (!payment) {
      payment = this.paymentRepository.create(
        {
          account,
          pod,
          membership,
          stripeReference: intent.id,
        },
        { partial: true },
      );
    }

    payment.amount = (pod.amount ?? 0).toFixed(2);
    payment.currency = (intent.currency ?? this.currency).toUpperCase();
    payment.status = intent.status;
    payment.description = intent.description ?? 'auto-debit';

    await this.paymentRepository.getEntityManager().persistAndFlush(payment);
  }

  private logStripeError(error: unknown): void {
    const err = error as any;
    if (err?.raw) {
      this.logger.error(
        `Stripe error: code=${err.raw.code ?? 'n/a'} type=${err.raw.type ?? 'n/a'} message=${err.raw.message ?? err.message}`,
      );
      if (err.raw?.decline_code) {
        this.logger.error(`Stripe decline_code=${err.raw.decline_code}`);
      }
    }
  }
}
