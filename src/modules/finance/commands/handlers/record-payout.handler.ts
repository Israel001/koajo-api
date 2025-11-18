import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RecordPayoutCommand } from '../record-payout.command';
import { PayoutEntity } from '../../entities/payout.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { TransactionType } from '../../transaction-type.enum';
import { RecordPayoutResult } from '../../contracts/payment-results';
import { CompleteMembershipCommand } from '../../../pods/commands/complete-membership.command';
import { PodActivityService } from '../../../pods/services/pod-activity.service';
import { PodActivityType } from '../../../pods/pod-activity-type.enum';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { InAppNotificationMessages } from '../../../notifications/in-app-notification.messages';

@Injectable()
@CommandHandler(RecordPayoutCommand)
export class RecordPayoutHandler
  implements ICommandHandler<RecordPayoutCommand, RecordPayoutResult>
{
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly commandBus: CommandBus,
    private readonly activityService: PodActivityService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(
    command: RecordPayoutCommand,
  ): Promise<RecordPayoutResult> {
    const stripeReference = command.stripeReference.trim();
    const currency = command.currency.trim().toUpperCase();
    const status = command.status.trim().toLowerCase();
    const description = command.description?.trim() ?? null;

    const existingPayout = await this.payoutRepository.findOne({
      stripeReference,
    });

    if (existingPayout) {
      throw new BadRequestException(
        'Payout already recorded for this Stripe reference.',
      );
    }

    const membership = await this.membershipRepository.findOne(
      {
        pod: command.podId,
        account: command.accountId,
      },
      {
        populate: ['pod', 'account'] as const,
      },
    );

    if (!membership || !membership.account) {
      throw new NotFoundException(
        'Pod membership not found for this account.',
      );
    }

    const account = membership.account;
    const pod = membership.pod;

    const amountCents = this.toMinorUnits(command.amount);
    const feeCents = this.toMinorUnits(command.fee);

    if (amountCents <= 0) {
      throw new BadRequestException('Payout amount must be greater than zero.');
    }

    if (feeCents < 0) {
      throw new BadRequestException('Payout fee cannot be negative.');
    }

    if (feeCents > amountCents) {
      throw new BadRequestException('Payout fee cannot exceed the amount.');
    }

    const payout = this.payoutRepository.create(
      {
        account,
        pod,
        membership,
        stripeReference,
        amount: this.formatMinor(amountCents),
        fee: this.formatMinor(feeCents),
        currency,
        status,
        description,
      },
      { partial: true },
    );

    const transaction = this.transactionRepository.create(
      {
        account,
        pod,
        membership,
        payout,
        type: TransactionType.PAYOUT,
        stripeReference,
        amount: payout.amount,
        currency,
        status,
        description,
      },
      { partial: true },
    );

    const em = this.payoutRepository.getEntityManager();
    em.persist(payout);
    em.persist(transaction);
    em.persist(membership);
    await em.flush();

    await this.activityService.recordActivity({
      pod,
      membership,
      account,
      type: PodActivityType.PAYOUT_RECORDED,
      metadata: {
        payoutId: payout.id,
        amount: payout.amount,
        fee: payout.fee,
        currency,
        status,
        stripeReference,
      },
    });

    const successful = this.isSuccessfulStatus(status);
    let membershipCompleted = membership.paidOut;

    return {
      payoutId: payout.id,
      transactionId: transaction.id,
      membershipId: membership.id,
      podId: pod.id,
      amount: payout.amount,
      currency,
      status,
      stripeReference,
      fee: payout.fee,
      membershipCompleted,
    };
  }

  private toMinorUnits(value: number | string): number {
    const amount =
      typeof value === 'number' ? value : Number.parseFloat(value);
    if (Number.isNaN(amount)) {
      throw new BadRequestException('Invalid amount provided.');
    }
    return Math.round(amount * 100);
  }

  private formatMinor(minorUnits: number): string {
    return (minorUnits / 100).toFixed(2);
  }

  private isSuccessfulStatus(status: string): boolean {
    const normalized = status.toLowerCase();
    return (
      normalized === 'paid' ||
      normalized === 'completed' ||
      normalized === 'succeeded' ||
      normalized === 'success'
    );
  }
}
