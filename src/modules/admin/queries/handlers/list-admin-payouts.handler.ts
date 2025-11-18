import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminPayoutsQuery } from '../list-admin-payouts.query';
import { PayoutEntity } from '../../../finance/entities/payout.entity';
import type { AdminPayoutListResult } from '../../contracts/admin-results';

@QueryHandler(ListAdminPayoutsQuery)
export class ListAdminPayoutsHandler
  implements IQueryHandler<ListAdminPayoutsQuery, AdminPayoutListResult>
{
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
  ) {}

  async execute(query: ListAdminPayoutsQuery): Promise<AdminPayoutListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const where: Record<string, any> = {};

    if (query.timeframe) {
      const now = new Date();
      if (query.timeframe === 'past') {
        where.membership = { payoutDate: { $lt: now } } as any;
      } else if (query.timeframe === 'upcoming') {
        where.membership = { payoutDate: { $gte: now } } as any;
      }
    }

    const [payouts, total] = await this.payoutRepository.findAndCount(where, {
      populate: ['pod', 'membership'] as const,
      orderBy:
        query.timeframe === 'upcoming'
          ? { membership: { payoutDate: 'ASC' } }
          : { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      total,
      items: payouts.map((payout) => ({
        id: payout.id,
        membershipId: payout.membership.id,
        podId: payout.pod.id,
        podPlanCode: payout.pod.planCode,
        podName: payout.pod.name ?? null,
        amount: payout.amount,
        fee: payout.fee,
        currency: payout.currency,
        status: payout.status,
        stripeReference: payout.stripeReference,
        description: payout.description ?? null,
        recordedAt: payout.createdAt.toISOString(),
      })),
    };
  }
}
