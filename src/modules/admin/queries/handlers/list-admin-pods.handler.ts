import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { ListAdminPodsQuery } from '../list-admin-pods.query';
import {
  AdminPodDetail,
  AdminPodInviteSummary,
  AdminPodMembershipSummary,
  AdminPodSummary,
  AdminPodsListResult,
} from '../../contracts/admin-results';
import { toAdminAccountDetail } from './list-admin-accounts.handler';
import { PodStatus } from '../../../pods/pod-status.enum';

export const toAdminPodSummary = (pod: PodEntity): AdminPodSummary => ({
  id: pod.id,
  type: pod.type,
  status: pod.status,
  amount: pod.amount,
  lifecycleWeeks: pod.lifecycleWeeks,
  maxMembers: pod.maxMembers,
  currentMembers: pod.memberships.length,
  creatorId: pod.creator?.id ?? null,
  createdAt: pod.createdAt.toISOString(),
});

export const toAdminPodDetail = (
  pod: PodEntity,
  pendingInvites: AdminPodInviteSummary[] = [],
): AdminPodDetail => {
  const memberships: AdminPodMembershipSummary[] = pod.memberships
    .getItems()
    .slice()
    .sort((a, b) => (a.finalOrder ?? a.joinOrder) - (b.finalOrder ?? b.joinOrder))
    .map((membership) => ({
      id: membership.id,
      accountId: membership.account?.id ?? null,
      account: membership.account ? toAdminAccountDetail(membership.account) : null,
      joinOrder: membership.joinOrder,
      finalOrder: membership.finalOrder ?? null,
      payoutDate: membership.payoutDate
        ? membership.payoutDate.toISOString()
        : null,
      paidOut: membership.paidOut,
      joinedAt: membership.joinedAt.toISOString(),
    }));

  return {
    ...toAdminPodSummary(pod),
    memberships,
    pendingInvites,
  };
};

@QueryHandler(ListAdminPodsQuery)
export class ListAdminPodsHandler
  implements IQueryHandler<ListAdminPodsQuery, AdminPodsListResult>
{
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
  ) {}

  async execute(query: ListAdminPodsQuery): Promise<AdminPodsListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const qb = this.podRepository.createQueryBuilder('pod');

    if (query.incompleteOnly) {
      qb.andWhere({ status: { $ne: PodStatus.COMPLETED } });
    }

    if (query.status) {
      qb.andWhere({ status: query.status });
    }

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere({
        $or: [
          { id: { $like: term } },
          { planCode: { $like: term } },
          { name: { $like: term } },
          { amount: { $like: term } as any },
          { maxMembers: { $like: term } as any },
          { lifecycleWeeks: { $like: term } as any },
          { status: { $like: term } },
        ],
      } as any);
    }

    qb.orderBy({ createdAt: 'DESC' }).limit(limit).offset(offset);

    const [pods, total] = await qb.getResultAndCount();
    await this.podRepository.populate(pods, ['memberships', 'creator']);

    return {
      total,
      items: pods.map((pod) => toAdminPodSummary(pod)),
    };
  }
}
