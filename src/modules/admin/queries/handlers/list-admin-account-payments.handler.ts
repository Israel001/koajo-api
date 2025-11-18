import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminAccountPaymentsQuery } from '../list-admin-account-payments.query';
import { PaymentEntity } from '../../../finance/entities/payment.entity';
import type { AdminPaymentListResult } from '../../contracts/admin-results';

@QueryHandler(ListAdminAccountPaymentsQuery)
export class ListAdminAccountPaymentsHandler
  implements IQueryHandler<ListAdminAccountPaymentsQuery, AdminPaymentListResult>
{
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
  ) {}

  async execute(
    query: ListAdminAccountPaymentsQuery,
  ): Promise<AdminPaymentListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const where: Record<string, unknown> = {
      account: query.accountId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [payments, total] = await this.paymentRepository.findAndCount(where, {
      populate: ['pod', 'membership'] as const,
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      total,
      items: payments.map((payment) => ({
        id: payment.id,
        membershipId: payment.membership.id,
        podId: payment.pod.id,
        podPlanCode: payment.pod.planCode,
        podName: payment.pod.name ?? null,
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
