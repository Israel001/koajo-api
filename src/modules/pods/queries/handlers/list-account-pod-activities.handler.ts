import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { PodActivityEntity } from '../../entities/pod-activity.entity';
import { ListAccountPodActivitiesQuery } from '../list-account-pod-activities.query';
import type { PodActivitiesListResult } from '../../contracts/pod-activity-summary';

@QueryHandler(ListAccountPodActivitiesQuery)
export class ListAccountPodActivitiesHandler
  implements
    IQueryHandler<ListAccountPodActivitiesQuery, PodActivitiesListResult>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodActivityEntity)
    private readonly activityRepository: EntityRepository<PodActivityEntity>,
  ) {}

  async execute(
    query: ListAccountPodActivitiesQuery,
  ): Promise<PodActivitiesListResult> {
    const limit = Math.min(Math.max(query.limit, 1), 100);
    const offset = Math.max(query.offset ?? 0, 0);

    const memberships = await this.membershipRepository.find(
      { account: query.accountId },
      { populate: ['pod'] as const },
    );

    const podIds = Array.from(
      new Set(
        memberships
          .map((membership) => membership.pod?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (podIds.length === 0) {
      return { total: 0, items: [] };
    }

    const [activities, total] = await this.activityRepository.findAndCount(
      { pod: { id: { $in: podIds } } },
      {
        populate: ['account'] as const,
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      },
    );

    return {
      total,
      items: activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
        createdAt: activity.createdAt.toISOString(),
        actor: activity.account
          ? {
              accountId: activity.account.id,
              avatarUrl: activity.account.avatarUrl ?? null,
            }
          : null,
      })),
    };
  }
}
