import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import type { PaymentListResult } from '../../contracts/payment-summary';
import { ListPodPaymentsQuery } from '../list-pod-payments.query';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { PaymentEntity } from '../../entities/payment.entity';

@QueryHandler(ListPodPaymentsQuery)
export class ListPodPaymentsHandler
  implements IQueryHandler<ListPodPaymentsQuery, PaymentListResult>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
  ) {}

  async execute(query: ListPodPaymentsQuery): Promise<PaymentListResult> {
    const membership = await this.membershipRepository.findOne({
      pod: query.podId,
      account: query.accountId,
    });

    if (!membership) {
      throw new NotFoundException('Pod not found or not accessible.');
    }

    const limit = Math.min(Math.max(query.limit, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const [payments, total] = await this.paymentRepository.findAndCount(
      { pod: query.podId, account: query.accountId },
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
