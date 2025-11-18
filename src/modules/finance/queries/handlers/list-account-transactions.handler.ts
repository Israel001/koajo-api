import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  TransactionListResult,
  TransactionSummary,
} from '../../contracts/payment-summary';
import { ListAccountTransactionsQuery } from '../list-account-transactions.query';
import { PaymentEntity } from '../../entities/payment.entity';
import { PayoutEntity } from '../../entities/payout.entity';

@QueryHandler(ListAccountTransactionsQuery)
export class ListAccountTransactionsHandler
  implements
    IQueryHandler<ListAccountTransactionsQuery, TransactionListResult>
{
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
  ) {}

  async execute(
    query: ListAccountTransactionsQuery,
  ): Promise<TransactionListResult> {
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);
    const now = new Date();

    const shouldIncludePayments =
      query.type === 'payments' || query.type === 'all';
    const shouldIncludePayouts =
      query.type === 'payouts' || query.type === 'all';

    const paymentWhere: any = { account: query.accountId };
    const payoutWhere: any = { account: query.accountId };

    if (query.status) {
      paymentWhere.status = query.status;
      payoutWhere.status = query.status;
    }

    if (query.timeframe === 'past') {
      paymentWhere.createdAt = { $lt: now };
      payoutWhere.membership = { payoutDate: { $lt: now } } as any;
    } else if (query.timeframe === 'upcoming') {
      paymentWhere.createdAt = { $gte: now };
      payoutWhere.membership = { payoutDate: { $gte: now } } as any;
    }

    if (query.from) {
      paymentWhere.createdAt = {
        ...(paymentWhere.createdAt ?? {}),
        $gte: new Date(query.from),
      };
      payoutWhere.createdAt = {
        ...(payoutWhere.createdAt ?? {}),
        $gte: new Date(query.from),
      };
    }

    if (query.to) {
      paymentWhere.createdAt = {
        ...(paymentWhere.createdAt ?? {}),
        $lte: new Date(query.to),
      };
      payoutWhere.createdAt = {
        ...(payoutWhere.createdAt ?? {}),
        $lte: new Date(query.to),
      };
    }

    const payments = shouldIncludePayments
      ? await this.paymentRepository.find(paymentWhere, {
          populate: ['pod', 'membership'] as const,
        })
      : [];

    const payouts = shouldIncludePayouts
      ? await this.payoutRepository.find(payoutWhere, {
          populate: ['pod', 'membership'] as const,
        })
      : [];

    const combine: TransactionSummary[] = [
      ...payments.map((payment) => ({
        id: payment.id,
        type: 'payment' as const,
        membershipId: payment.membership.id,
        podId: payment.pod.id,
        podName: payment.pod.name ?? null,
        podPlanCode: payment.pod.planCode,
        amount: payment.amount,
        fee: null,
        currency: payment.currency,
        status: payment.status,
        stripeReference: payment.stripeReference,
        description: payment.description ?? null,
        recordedAt: payment.createdAt.toISOString(),
        payoutDate: null,
      })),
      ...payouts.map((payout) => ({
        id: payout.id,
        type: 'payout' as const,
        membershipId: payout.membership.id,
        podId: payout.pod.id,
        podName: payout.pod.name ?? null,
        podPlanCode: payout.pod.planCode,
        amount: payout.amount,
        fee: payout.fee,
        currency: payout.currency,
        status: payout.status,
        stripeReference: payout.stripeReference,
        description: payout.description ?? null,
        recordedAt: payout.createdAt.toISOString(),
        payoutDate: payout.membership.payoutDate
          ? payout.membership.payoutDate.toISOString()
          : null,
      })),
    ];

    combine.sort((a, b) => {
      const dir = query.sort === 'asc' ? 1 : -1;
      return (new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()) * dir;
    });

    const total = combine.length;
    const items = combine.slice(offset, offset + limit);

    return { total, items };
  }
}
