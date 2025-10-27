import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { PodActivityEntity } from '../../../pods/entities/pod-activity.entity';
import { ListAdminPodActivitiesQuery } from '../list-admin-pod-activities.query';
import type { PodActivitySummary } from '../../../pods/contracts/pod-activity-summary';

@Injectable()
@QueryHandler(ListAdminPodActivitiesQuery)
export class ListAdminPodActivitiesHandler
  implements IQueryHandler<ListAdminPodActivitiesQuery, PodActivitySummary[]>
{
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodActivityEntity)
    private readonly activityRepository: EntityRepository<PodActivityEntity>,
  ) {}

  async execute(
    query: ListAdminPodActivitiesQuery,
  ): Promise<PodActivitySummary[]> {
    const pod = await this.podRepository.findOne({
      id: query.podId,
    });

    if (!pod) {
      throw new NotFoundException('Pod not found.');
    }

    const limit = Math.min(Math.max(query.limit, 1), 100);

    const activities = await this.activityRepository.find(
      { pod },
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
