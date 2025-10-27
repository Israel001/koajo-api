import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { PodActivityEntity } from '../../entities/pod-activity.entity';
import { ListPodActivitiesQuery } from '../list-pod-activities.query';
import type { PodActivitySummary } from '../../contracts/pod-activity-summary';

@QueryHandler(ListPodActivitiesQuery)
export class ListPodActivitiesHandler
  implements IQueryHandler<ListPodActivitiesQuery, PodActivitySummary[]>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodActivityEntity)
    private readonly activityRepository: EntityRepository<PodActivityEntity>,
  ) {}

  async execute(
    query: ListPodActivitiesQuery,
  ): Promise<PodActivitySummary[]> {
    const membership = await this.membershipRepository.findOne({
      pod: query.podId,
      account: query.accountId,
    });

    if (!membership) {
      throw new NotFoundException('Pod not found or not accessible.');
    }

    const limit = Math.min(Math.max(query.limit, 1), 100);

    const activities = await this.activityRepository.find(
      { pod: query.podId },
      {
        populate: ['account'] as const,
        orderBy: { createdAt: 'DESC' },
        limit,
      },
    );

    return activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
      createdAt: activity.createdAt.toISOString(),
      actor: activity.account
        ? {
            accountId: activity.account.id,
            email: activity.account.email ?? null,
            firstName: activity.account.firstName ?? null,
            lastName: activity.account.lastName ?? null,
          }
        : null,
    }));
  }
}
