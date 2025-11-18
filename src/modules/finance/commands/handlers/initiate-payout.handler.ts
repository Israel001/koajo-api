import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import Stripe from 'stripe';
import { InitiatePayoutCommand } from '../initiate-payout.command';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { ConfigService } from '@nestjs/config';
import { TransactionEntity } from '../../entities/transaction.entity';
import { PayoutEntity } from '../../entities/payout.entity';
import { CompleteMembershipCommand } from '../../../pods/commands/complete-membership.command';
import { TransactionType } from '../../transaction-type.enum';

@Injectable()
@CommandHandler(InitiatePayoutCommand)
export class InitiatePayoutHandler
  implements ICommandHandler<InitiatePayoutCommand>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: InitiatePayoutCommand): Promise<{
    payoutId: string;
    status: string;
    stripeReference: string;
    amount: string;
    fee: string;
  }> {
    const membership = await this.membershipRepository.findOne(
      { id: command.membershipId },
      { populate: ['pod', 'account'] as const },
    );

    if (!membership || !membership.account || !membership.pod) {
      throw new NotFoundException('Membership not found or incomplete.');
    }

    const account = membership.account;
    const pod = membership.pod;

    if (!command.initiatedByAdmin) {
      if (
        account.requiresFraudReview ||
        account.missedPaymentFlag ||
        account.overheatFlag
      ) {
        throw new BadRequestException('Account is flagged; payout skipped.');
      }
    }

    if (
      !account.stripeCustomerId ||
      !account.stripePaymentMethodId ||
      !account.stripeConnectedAccountId
    ) {
      throw new BadRequestException(
        'Stripe customer, payment method, and connected account are required to initiate payout.',
      );
    }

    const activePayout = await this.payoutRepository.findOne({
      membership,
      status: { $nin: ['failed', 'payment_failed', 'canceled', 'cancelled', 'rejected', 'error'] },
    });
    if (activePayout) {
      throw new BadRequestException(
        'Payout already in progress or completed for this membership.',
      );
    }

    const { grossCents, feeCents, netCents } = this.computeNetAmount(membership, pod);
    if (netCents <= 0) {
      throw new BadRequestException('Calculated payout amount must be greater than zero.');
    }

    const stripe = this.getStripeClient();
    const currency =
      this.configService.get<string>('stripe.defaultCurrency', { infer: true }) ??
      'usd';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: netCents,
      currency: currency.toLowerCase(),
      customer: account.stripeCustomerId,
      payment_method: account.stripePaymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      off_session: true,
      setup_future_usage: 'off_session',
      transfer_data: {
        destination: account.stripeConnectedAccountId,
      },
      metadata: {
        type: 'payout',
        podId: pod.id,
        membershipId: membership.id,
        accountId: account.id,
        feeCents: feeCents.toString(),
        grossCents: grossCents.toString(),
        netCents: netCents.toString(),
      },
      description: command.description ?? 'pod-payout',
    });

    const fee = this.formatMinor(feeCents);
    const netAmount = this.formatMinor(netCents);

    const payout = this.payoutRepository.create(
      {
        account,
        pod,
        membership,
        stripeReference: paymentIntent.id,
        amount: netAmount,
        fee,
        currency: currency.toUpperCase(),
        status: paymentIntent.status,
        description: command.description ?? 'pod-payout',
      },
      { partial: true },
    );

    const transaction = this.transactionRepository.create(
      {
        account,
        pod,
        membership,
        payout,
        stripeReference: paymentIntent.id,
        amount: netAmount,
        currency: currency.toUpperCase(),
        status: paymentIntent.status,
        description: command.description ?? 'pod-payout',
        type: TransactionType.PAYOUT,
      },
      { partial: true },
    );

    const em = this.payoutRepository.getEntityManager();
    em.persist(payout);
    em.persist(transaction);
    await em.flush();

    return {
      payoutId: payout.id,
      status: payout.status,
      stripeReference: paymentIntent.id,
      amount: payout.amount,
      fee: payout.fee,
    };
  }

  private computeNetAmount(
    membership: PodMembershipEntity,
    pod: PodEntity,
  ): { grossCents: number; feeCents: number; netCents: number } {
    const cycles = Math.ceil(pod.lifecycleWeeks / 2);
    const gross = pod.amount * cycles;
    const totalMembers = pod.maxMembers ?? pod.memberships.length ?? 0;
    const order = membership.finalOrder ?? membership.joinOrder ?? 0;
    let feeRate = 0.025;
    if (totalMembers >= 2 && order === totalMembers - 1) {
      feeRate = 0.015;
    } else if (totalMembers >= 1 && order === totalMembers) {
      feeRate = 0;
    }
    const grossCents = Math.round(gross * 100);
    const feeCents = Math.round(grossCents * feeRate);
    const netCents = grossCents - feeCents;
    return { grossCents, feeCents, netCents };
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

  private formatMinor(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2);
  }
}
