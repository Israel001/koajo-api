import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import type { Request } from 'express';
import Stripe from 'stripe';
import { PodEntity } from '../entities/pod.entity';
import { PodMembershipEntity } from '../entities/pod-membership.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { RecordPaymentCommand } from '../../finance/commands/record-payment.command';
import { addDays, startOfDay } from '../pod.utils';
import { CustomPodCadence } from '../custom-pod-cadence.enum';
import { PodType } from '../pod-type.enum';
import { nextContributionWindowStart } from '../pod.utils';
import { PayoutEntity } from '../../finance/entities/payout.entity';
import { TransactionEntity } from '../../finance/entities/transaction.entity';
import { CompleteMembershipCommand } from '../commands/complete-membership.command';
import { TransactionType } from '../../finance/transaction-type.enum';
import { RecordPayoutCommand } from '../../finance/commands/record-payout.command';
import { MailService } from '../../../common/notification/mail.service';

@Controller({ path: 'pods/stripe/webhook', version: '1' })
export class InternalStripeWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
    private readonly mailService: MailService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ): Promise<void> {
    const stripe = this.getStripeClient();
    const webhookSecret =
      this.configService.get<string>('stripe.webhookSecret', {
        infer: true,
      }) ?? '';

    const rawBody = (req as any).rawBody;
    const isRawBuffer = Buffer.isBuffer(rawBody);
    const isBodyBuffer = Buffer.isBuffer(req.body);

    let event: Stripe.Event;
    try {
      if (webhookSecret && signature) {
        const payload =
          rawBody ??
          (isBodyBuffer
            ? (req.body as Buffer)
            : typeof req.body === 'string'
              ? req.body
              : JSON.stringify(req.body));
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret,
        );
      } else {
        event = req.body;
      }
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(error as Error).message}`,
      );
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const intent = event.data.object as Stripe.PaymentIntent;
      const metadataType = (intent.metadata?.type ?? '').toLowerCase();
      if (metadataType === 'payout') {
        await this.handlePayoutIntent(intent);
      } else {
        await this.handlePaymentIntent(intent);
      }
    }
  }

  private async handlePaymentIntent(intent: Stripe.PaymentIntent): Promise<void> {
    const metadata = intent.metadata ?? {};
    const podId = metadata.podId ?? metadata.pod_id;
    const membershipId = metadata.membershipId ?? metadata.membership_id;
    const accountId = metadata.accountId ?? metadata.account_id;

    if (!podId || !membershipId || !accountId) {
      return;
    }

    const membership = await this.membershipRepository.findOne(
      { id: membershipId, pod: podId, account: accountId },
      { populate: ['pod', 'account'] as const },
    );

    if (!membership || !membership.pod || !membership.account) {
      return;
    }

    const pod = membership.pod;
    const account = membership.account;

    const expectedCents = Math.round(Number(pod.amount) * 100);
    const receivedCents = intent.amount_received ?? intent.amount ?? 0;
    const currency = (intent.currency ?? '').toUpperCase();
    const defaultCurrency =
      (this.configService.get<string>('stripe.defaultCurrency', {
        infer: true,
      }) ?? 'usd').toUpperCase();

    if (receivedCents !== expectedCents || currency !== defaultCurrency) {
      const wasFlagged = account.missedPaymentFlag;
      account.flagMissedPayment('amount_or_currency_mismatch');
      pod.nextContributionDate = addDays(startOfDay(new Date()), 1);
      await this.accountRepository.getEntityManager().flush();
      await this.podRepository.getEntityManager().flush();
      if (!wasFlagged) {
        await this.mailService.sendMissedContributionEmail({
          email: account.email,
          amount: pod.amount,
          firstName: account.firstName ?? null,
          reason: 'amount_or_currency_mismatch',
        });
      }
      return;
    }

    if (intent.status === 'succeeded') {
      await this.commandBus.execute(
        new RecordPaymentCommand(
          account.id,
          pod.id,
          intent.id,
          pod.amount,
          currency,
          intent.status,
          intent.description ?? 'ach-webhook',
        ),
      );
      this.advanceNextContributionDate(pod);
      await this.podRepository.getEntityManager().flush();

      await this.mailService.sendPaymentSuccessEmail({
        email: account.email,
        amount: pod.amount,
        nextContributionDate: pod.nextContributionDate ?? null,
        firstName: account.firstName ?? null,
      });
      return;
    }

    if (intent.status === 'processing') {
      return;
    }

    const wasFlagged = account.missedPaymentFlag;
    account.flagMissedPayment(`payment_status:${intent.status}`);
    pod.nextContributionDate = addDays(startOfDay(new Date()), 1);
    await this.accountRepository.getEntityManager().flush();
    await this.podRepository.getEntityManager().flush();
    if (!wasFlagged) {
      await this.mailService.sendMissedContributionEmail({
        email: account.email,
        amount: pod.amount,
        firstName: account.firstName ?? null,
        reason: `payment_status:${intent.status}`,
      });
    }
  }

  private async handlePayoutIntent(intent: Stripe.PaymentIntent): Promise<void> {
    const metadata = intent.metadata ?? {};
    const podId = metadata.podId ?? metadata.pod_id;
    const membershipId = metadata.membershipId ?? metadata.membership_id;
    const accountId = metadata.accountId ?? metadata.account_id;

    if (!podId || !membershipId || !accountId) {
      throw new BadRequestException('Payout intent missing metadata.');
    }

    const existing = await this.payoutRepository.findOne(
      { stripeReference: intent.id },
      { populate: ['membership'] as const },
    );

    if (existing) {
      existing.status = intent.status;
      existing.description =
        intent.description ?? existing.description ?? null;
      const txn = await this.transactionRepository.findOne({
        stripeReference: intent.id,
        type: TransactionType.PAYOUT,
      });
      if (txn) {
        txn.status = intent.status;
        txn.description = intent.description ?? txn.description ?? null;
      }
      await this.payoutRepository.getEntityManager().flush();

      if (intent.status === 'succeeded' && existing.membership && !existing.membership.paidOut) {
        await this.commandBus.execute(
          new CompleteMembershipCommand(existing.membership.id),
        );
      }
      return;
    }

    const feeCents = metadata.feeCents ? Number(metadata.feeCents) : 0;
    const amountCents = intent.amount_received ?? intent.amount ?? 0;
    const fee = (feeCents / 100).toFixed(2);
    const amount = (amountCents / 100).toFixed(2);

    await this.commandBus.execute(
      new RecordPayoutCommand(
        accountId,
        podId,
        intent.id,
        Number(amount),
        Number(fee),
        intent.currency ?? 'usd',
        intent.status,
        intent.description ?? 'payout-webhook',
      ),
    );

    try {
      if (intent.status === 'succeeded') {
        await this.commandBus.execute(
          new CompleteMembershipCommand(membershipId),
        );
      }
    } catch {
      // ignore completion failure
    }
  }

  private getStripeClient(): Stripe {
    const secret =
      this.configService.get<string>('stripe.secretKey', { infer: true }) ?? '';
    const apiVersion =
      this.configService.get<string>('stripe.apiVersion', { infer: true }) ??
      '2024-06-20';

    if (!secret.trim().length) {
      throw new BadRequestException('Stripe secret key is not configured.');
    }

    return new Stripe(secret, { apiVersion: apiVersion as Stripe.LatestApiVersion });
  }

  private advanceNextContributionDate(pod: PodEntity): void {
    const cadence =
      pod.type === PodType.CUSTOM
        ? pod.cadence ?? CustomPodCadence.BI_WEEKLY
        : CustomPodCadence.BI_WEEKLY;
    const current =
      pod.nextContributionDate ?? pod.startDate ?? startOfDay(new Date());
    pod.nextContributionDate = nextContributionWindowStart(current, cadence);
  }
}
