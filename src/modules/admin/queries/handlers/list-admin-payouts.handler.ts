import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminPayoutsQuery } from '../list-admin-payouts.query';
import { PayoutEntity } from '../../../finance/entities/payout.entity';
import type {
  AdminPayoutListResult,
  AdminPayoutSummary,
} from '../../contracts/admin-results';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import {
  calculateNetPayout,
  calculateGrossPayout,
  getPayoutPosition,
} from '../../../finance/utils/payout-calculator.util';

@QueryHandler(ListAdminPayoutsQuery)
export class ListAdminPayoutsHandler
  implements IQueryHandler<ListAdminPayoutsQuery, AdminPayoutListResult>
{
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
  ) {}

  async execute(query: ListAdminPayoutsQuery): Promise<AdminPayoutListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    if (query.timeframe === 'upcoming') {
      return this.listUpcomingPayouts(limit, offset);
    }

    if (query.timeframe === 'past') {
      return this.listRecordedPayouts(limit, offset);
    }

    const expanded = limit + offset;
    const upcoming = await this.listUpcomingPayouts(expanded, 0);
    const recorded = await this.listRecordedPayouts(expanded, 0);
    const combinedItems = [...upcoming.items, ...recorded.items];
    return {
      total: upcoming.total + recorded.total,
      items: combinedItems.slice(offset, offset + limit),
    };
  }

  private async listRecordedPayouts(
    limit: number,
    offset: number,
  ): Promise<AdminPayoutListResult> {
    const where: Record<string, any> = { account: { $ne: null } };

    const [payouts, total] = await this.payoutRepository.findAndCount(where, {
      populate: ['pod', 'membership', 'membership.account'] as const,
      orderBy: { createdAt: 'DESC' },
      limit,
      offset,
    });

    return {
      total,
      items: payouts
        .map((payout) =>
          this.buildSummaryFromMembership(payout.membership, {
            id: payout.id,
            amount: payout.amount,
            fee: payout.fee,
            currency: payout.currency,
            status: payout.status,
            stripeReference: payout.stripeReference,
            description: payout.description ?? null,
            recordedAt: payout.createdAt.toISOString(),
            totalPayout: payout.amount,
            payoutDate:
              payout.membership.payoutDate?.toISOString() ??
              payout.createdAt.toISOString(),
          }),
        )
        .filter((item): item is AdminPayoutSummary => Boolean(item)),
    };
  }

  private async listUpcomingPayouts(
    limit: number,
    offset: number,
  ): Promise<AdminPayoutListResult> {
    const now = new Date();
    const [memberships, total] = await this.membershipRepository.findAndCount(
      {
        payoutDate: { $gte: now },
        paidOut: false,
        account: { $ne: null },
      },
      {
        populate: ['pod', 'account'] as const,
        orderBy: { payoutDate: 'ASC' },
        limit,
        offset,
      },
    );

    return {
      total,
      items: memberships
        .map((membership) =>
          this.buildSummaryFromMembership(membership, {
            id: `scheduled:${membership.id}`,
            amount: calculateNetPayout(membership),
            fee: '0.00',
            currency: 'USD',
            status: 'scheduled',
            stripeReference: '',
            description: 'Scheduled payout',
            recordedAt:
              membership.payoutDate?.toISOString() ??
              new Date().toISOString(),
            totalPayout: null,
            payoutDate: membership.payoutDate
              ? membership.payoutDate.toISOString()
              : null,
          }),
        )
        .filter((item): item is AdminPayoutSummary => Boolean(item)),
    };
  }

  private buildSummaryFromMembership(
    membership: PodMembershipEntity,
    overrides: Partial<AdminPayoutSummary>,
  ): AdminPayoutSummary | null {
    const account = membership.account;
    const pod = membership.pod;
    if (!account) {
      return null;
    }
    const payoutPosition = getPayoutPosition(membership);
    const podValue = calculateGrossPayout(membership).toFixed(2);
    const calculatedNet = calculateNetPayout(membership);
    const totalPayout =
      typeof overrides.totalPayout !== 'undefined'
        ? overrides.totalPayout
        : null;
    return {
      id: overrides.id ?? '',
      membershipId: membership.id,
      podId: pod.id,
      podPlanCode: pod.planCode,
      podName: pod.name ?? null,
      userFirstName: account.firstName ?? null,
      userLastName: account.lastName ?? null,
      userEmail: account.email,
      bankName: account.stripeBankName ?? null,
      bankAccountLast4: account.stripeBankAccountLast4 ?? null,
      payoutPosition,
      payoutDate:
        overrides.payoutDate ?? membership.payoutDate?.toISOString() ?? null,
      podValue,
      totalPayout,
      amount: overrides.amount ?? calculatedNet,
      fee: overrides.fee ?? '0.00',
      currency: overrides.currency ?? 'USD',
      status: overrides.status ?? 'scheduled',
      stripeReference: overrides.stripeReference ?? '',
      description: overrides.description ?? null,
      recordedAt: overrides.recordedAt ?? new Date().toISOString(),
    };
  }
}
