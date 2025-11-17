import {
  BadRequestException,
  Body,
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
import { PodEntity } from '../../pods/entities/pod.entity';
import { PodMembershipEntity } from '../../pods/entities/pod-membership.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { RecordPaymentCommand } from '../commands/record-payment.command';
import { addDays, startOfDay } from '../../pods/pod.utils';
import { PodType } from '../../pods/pod-type.enum';
import { CustomPodCadence } from '../../pods/custom-pod-cadence.enum';
import { nextContributionWindowStart } from '../../pods/pod.utils';

@Controller({ path: 'stripe/webhook', version: '1' })
export class StripeWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string | undefined,
    @Body() body: any,
  ): Promise<void> {
    const stripe = this.getStripeClient();
    const webhookSecret =
      this.configService.get<string>('stripe.webhookSecret', {
        infer: true,
      }) ?? '';

    let event: Stripe.Event;
    try {
      if (webhookSecret && signature) {
        const payload =
          (req as any).rawBody ??
          (typeof body === 'string' ? body : JSON.stringify(body));
        event = stripe.webhooks.constructEvent(
          payload,
          signature,
          webhookSecret,
        );
      } else {
        event = body;
      }
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${(error as Error).message}`,
      );
    }

    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentIntent(intent);
    }
  }

  private async handlePaymentIntent(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const metadata = intent.metadata ?? {};
    const podId = metadata.podId ?? metadata.pod_id;
    const membershipId = metadata.membershipId ?? metadata.membership_id;
    const accountId = metadata.accountId ?? metadata.account_id;

    if (!podId || !membershipId || !accountId) {
      throw new BadRequestException('Payment intent missing metadata.');
    }

    const membership = await this.membershipRepository.findOne(
      { id: membershipId, pod: podId, account: accountId },
      { populate: ['pod', 'account'] as const },
    );

    if (!membership || !membership.pod || !membership.account) {
      throw new BadRequestException(
        'Referenced membership/pod/account not found.',
      );
    }

    const pod = membership.pod;
    const account = membership.account;
    const expectedCents = Math.round(Number(pod.amount) * 100);
    const receivedCents = intent.amount_received ?? intent.amount ?? 0;
    const currency = (intent.currency ?? '').toUpperCase();
    const defaultCurrency = (
      this.configService.get<string>('stripe.defaultCurrency', {
        infer: true,
      }) ?? 'usd'
    ).toUpperCase();

    if (receivedCents !== expectedCents || currency !== defaultCurrency) {
      account.flagMissedPayment('amount_or_currency_mismatch');
      await this.accountRepository.getEntityManager().flush();
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
      return;
    }

    account.flagMissedPayment(`payment_status:${intent.status}`);
    pod.nextContributionDate = addDays(startOfDay(new Date()), 1);
    await this.accountRepository.getEntityManager().flush();
    await this.podRepository.getEntityManager().flush();
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

    return new Stripe(secret, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
    });
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
}
