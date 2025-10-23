import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RecordPaymentCommand } from '../record-payment.command';
import { PaymentEntity } from '../../entities/payment.entity';
import { TransactionEntity } from '../../entities/transaction.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { TransactionType } from '../../transaction-type.enum';
import { RecordPaymentResult } from '../../contracts/payment-results';

@Injectable()
@CommandHandler(RecordPaymentCommand)
export class RecordPaymentHandler
  implements ICommandHandler<RecordPaymentCommand, RecordPaymentResult>
{
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
  ) {}

  async execute(
    command: RecordPaymentCommand,
  ): Promise<RecordPaymentResult> {
    const stripeReference = command.stripeReference.trim();
    const currency = command.currency.trim().toUpperCase();
    const status = command.status.trim().toLowerCase();
    const description = command.description?.trim() ?? null;

    const existingPayment = await this.paymentRepository.findOne({
      stripeReference,
    });

    if (existingPayment) {
      throw new BadRequestException(
        'Payment already recorded for this Stripe reference.',
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

    const pod = membership.pod;
    const account = membership.account;

    const amountCents = this.toMinorUnits(command.amount);
    const expectedCents = this.toMinorUnits(pod.amount);

    if (amountCents !== expectedCents) {
      throw new BadRequestException(
        `Payment amount mismatch. Expected ${this.formatMinor(expectedCents)}.`,
      );
    }

    const incrementedTotal =
      this.toMinorUnits(membership.totalContributed ?? '0') + amountCents;

    membership.totalContributed = this.formatMinor(incrementedTotal);

    const payment = this.paymentRepository.create(
      {
        account,
        pod,
        membership,
        stripeReference,
        amount: this.formatMinor(amountCents),
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
        payment,
        type: TransactionType.PAYMENT,
        stripeReference,
        amount: payment.amount,
        currency,
        status,
        description,
      },
      { partial: true },
    );

    const em = this.paymentRepository.getEntityManager();
    em.persist(payment);
    em.persist(transaction);
    em.persist(membership);
    await em.flush();

    return {
      paymentId: payment.id,
      transactionId: transaction.id,
      membershipId: membership.id,
      podId: pod.id,
      amount: payment.amount,
      currency,
      status,
      stripeReference,
      totalContributed: membership.totalContributed,
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
}
