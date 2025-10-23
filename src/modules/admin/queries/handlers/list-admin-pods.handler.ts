import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { ListAdminPodsQuery } from '../list-admin-pods.query';
import {
  AdminPodDetail,
  AdminPodMembershipSummary,
  AdminPodSummary,
  AdminPodsListResult,
} from '../../contracts/admin-results';

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

export const toAdminPodDetail = (pod: PodEntity): AdminPodDetail => {
  const memberships: AdminPodMembershipSummary[] = pod.memberships
    .getItems()
    .map((membership) => ({
      id: membership.id,
      accountId: membership.account?.id ?? null,
      joinOrder: membership.joinOrder,
      finalOrder: membership.finalOrder ?? null,
      payoutDate: membership.payoutDate
        ? membership.payoutDate.toISOString()
        : null,
      paidOut: membership.paidOut,
    }));

  return {
    ...toAdminPodSummary(pod),
    memberships,
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

    const [pods, total] = await this.podRepository.findAndCount(
      {},
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
        populate: ['memberships', 'creator'] as const,
      },
    );

    return {
      total,
      items: pods.map((pod) => toAdminPodSummary(pod)),
    };
  }
}
