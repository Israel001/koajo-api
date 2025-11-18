import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import type { PaymentListResult } from '../../contracts/payment-summary';
import { ListAccountPaymentsQuery } from '../list-account-payments.query';
import { PaymentEntity } from '../../entities/payment.entity';

@QueryHandler(ListAccountPaymentsQuery)
export class ListAccountPaymentsHandler
  implements IQueryHandler<ListAccountPaymentsQuery, PaymentListResult>
{
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
  ) {}

  async execute(
    query: ListAccountPaymentsQuery,
  ): Promise<PaymentListResult> {
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const [payments, total] = await this.paymentRepository.findAndCount(
      { account: query.accountId },
      {
        populate: ['pod', 'membership'] as const,
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      },
    );

    return {
      total,
      items: payments.map((payment) => ({
        id: payment.id,
        membershipId: payment.membership.id,
        podId: payment.pod.id,
        podName: payment.pod.name ?? null,
        podPlanCode: payment.pod.planCode,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        stripeReference: payment.stripeReference,
        description: payment.description ?? null,
        recordedAt: payment.createdAt.toISOString(),
      })),
    };
  }
}
