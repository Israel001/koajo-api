import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import type { PayoutListResult } from '../../contracts/payment-summary';
import { ListPodPayoutsQuery } from '../list-pod-payouts.query';
import { PayoutEntity } from '../../entities/payout.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import {
  calculateNetPayout,
  getPayoutPosition,
} from '../../utils/payout-calculator.util';

@QueryHandler(ListPodPayoutsQuery)
export class ListPodPayoutsHandler
  implements IQueryHandler<ListPodPayoutsQuery, PayoutListResult>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
  ) {}

  async execute(query: ListPodPayoutsQuery): Promise<PayoutListResult> {
    const membership = await this.membershipRepository.findOne({
      pod: query.podId,
      account: query.accountId,
    });

    if (!membership) {
      throw new NotFoundException('Pod not found or not accessible.');
    }

    const limit = Math.min(Math.max(query.limit, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const where: any = { pod: query.podId, account: query.accountId };
    if (query.status) {
      where.status = query.status;
    }
    const now = new Date();
    if (query.timeframe === 'past') {
      where.membership = { payoutDate: { $lt: now } } as any;
    } else if (query.timeframe === 'upcoming') {
      where.membership = { payoutDate: { $gte: now } } as any;
    }
    if (query.from) {
      where.createdAt = { ...(where.createdAt ?? {}), $gte: new Date(query.from) };
    }
    if (query.to) {
      where.createdAt = { ...(where.createdAt ?? {}), $lte: new Date(query.to) };
    }
    const orderBy =
      query.sort === 'asc' ? { createdAt: 'ASC' } : { createdAt: 'DESC' };

    const [payouts, total] = await this.payoutRepository.findAndCount(where, {
      populate: ['pod', 'membership', 'membership.pod', 'account'] as const,
      orderBy,
      limit,
      offset,
    });

    return {
      total,
      items: payouts.map((payout) => {
        const membership = payout.membership;
        const account = payout.account;
        return {
          id: payout.id,
          membershipId: membership.id,
          podId: payout.pod.id,
          podName: payout.pod.name ?? null,
          podPlanCode: payout.pod.planCode,
          userFirstName: account.firstName ?? null,
          userLastName: account.lastName ?? null,
          userEmail: account.email,
          bankName: account.stripeBankName ?? null,
          bankAccountLast4: account.stripeBankAccountLast4 ?? null,
          payoutPosition: getPayoutPosition(membership),
          payoutDate: membership.payoutDate
            ? membership.payoutDate.toISOString()
            : null,
          totalPayout: calculateNetPayout(membership),
          amount: payout.amount,
          fee: payout.fee,
          currency: payout.currency,
          status: payout.status,
          stripeReference: payout.stripeReference,
          description: payout.description ?? null,
          recordedAt: payout.createdAt.toISOString(),
        };
      }),
    };
  }
}
