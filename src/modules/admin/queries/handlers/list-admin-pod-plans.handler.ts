import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { FilterQuery } from '@mikro-orm/core';
import { PodPlanEntity } from '../../../pods/entities/pod-plan.entity';
import { ListAdminPodPlansQuery } from '../list-admin-pod-plans.query';
import type {
  AdminPodPlanSummary,
  AdminPodPlansListResult,
} from '../../contracts/admin-results';
import { AdminPodPlanService } from '../../services/admin-pod-plan.service';

@Injectable()
@QueryHandler(ListAdminPodPlansQuery)
export class ListAdminPodPlansHandler
  implements IQueryHandler<ListAdminPodPlansQuery, AdminPodPlansListResult>
{
  constructor(
    @InjectRepository(PodPlanEntity)
    private readonly podPlanRepository: EntityRepository<PodPlanEntity>,
    private readonly podPlanService: AdminPodPlanService,
  ) {}

  async execute(
    query: ListAdminPodPlansQuery,
  ): Promise<AdminPodPlansListResult> {
    const where: FilterQuery<PodPlanEntity> = {};

    if (query.search && query.search.trim().length > 0) {
      where.code = { $like: `%${query.search.trim().toUpperCase()}%` };
    }

    const [total, plans] = await Promise.all([
      this.podPlanRepository.count(where),
      this.podPlanRepository.find(where, {
        orderBy: { createdAt: 'DESC' },
        limit: query.limit,
        offset: query.offset,
      }),
    ]);

    const items = plans.length
      ? await this.composeSummaries(plans)
      : [];

    return {
      total,
      items,
    };
  }

  private async composeSummaries(
    plans: PodPlanEntity[],
  ): Promise<AdminPodPlanSummary[]> {
    const usageMap = await this.podPlanService.getUsageMap(
      plans.map((plan) => plan.code),
    );

    return plans.map((plan) => {
      const usage = usageMap.get(plan.code) ?? {
        totalPods: 0,
        podsWithMembers: 0,
      };
      const canModify = usage.podsWithMembers === 0;

      return {
        id: plan.id,
        code: plan.code,
        amount: plan.amount,
        lifecycleWeeks: plan.lifecycleWeeks,
        maxMembers: plan.maxMembers,
        active: plan.active,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
        totalPods: usage.totalPods,
        podsWithMembers: usage.podsWithMembers,
        canEdit: canModify,
        canDelete: canModify,
      };
    });
  }
}
