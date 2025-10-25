import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { raw } from '@mikro-orm/core';
import { PodEntity } from '../../pods/entities/pod.entity';
import { PodMembershipEntity } from '../../pods/entities/pod-membership.entity';
import type { PodPlanEntity } from '../../pods/entities/pod-plan.entity';
import type { AdminPodPlanSummary } from '../contracts/admin-results';

interface UsageStats {
  totalPods: number;
  podsWithMembers: number;
}

@Injectable()
export class AdminPodPlanService {
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly podMembershipRepository: EntityRepository<PodMembershipEntity>,
  ) {}

  async hasPodsWithRealMembers(planCode: string): Promise<boolean> {
    const row = (await this.podMembershipRepository
      .createQueryBuilder('membership')
      .select([raw('count(*) as total')])
      .leftJoin('membership.pod', 'pod')
      .where({
        pod: { planCode },
        isSystemBot: false,
        account: { $ne: null },
      })
      .limit(1)
      .execute('get')) as { total?: string | number } | null;

    const total = Number.parseInt(String(row?.total ?? '0'), 10);
    return total > 0;
  }

  async getUsageMap(planCodes: readonly string[]): Promise<Map<string, UsageStats>> {
    const uniqueCodes = Array.from(new Set(planCodes));
    const map = new Map<string, UsageStats>();

    if (uniqueCodes.length === 0) {
      return map;
    }

    const podCounts = await this.podRepository
      .createQueryBuilder('pod')
      .select([
        raw('pod.plan_code as planCode'),
        raw('count(pod.id) as totalPods'),
      ])
      .where({ planCode: { $in: uniqueCodes } })
      .groupBy('pod.plan_code')
      .execute();

    (podCounts as Array<{ planCode?: string; totalPods?: string | number }>).forEach(
      (row) => {
        if (!row.planCode) {
          return;
        }
        map.set(row.planCode, {
          totalPods: Number.parseInt(String(row.totalPods ?? '0'), 10),
          podsWithMembers: 0,
        });
      },
    );

    const podsWithMembers = await this.podMembershipRepository
      .createQueryBuilder('membership')
      .select([
        raw('pod.plan_code as planCode'),
        raw('count(distinct pod.id) as podsWithMembers'),
      ])
      .leftJoin('membership.pod', 'pod')
      .where({
        pod: { planCode: { $in: uniqueCodes } },
        isSystemBot: false,
        account: { $ne: null },
      })
      .groupBy('pod.plan_code')
      .execute();

    (podsWithMembers as Array<{ planCode?: string; podsWithMembers?: string | number }>).forEach(
      (row) => {
        if (!row.planCode) {
          return;
        }
        const entry =
          map.get(row.planCode) ??
          {
            totalPods: 0,
            podsWithMembers: 0,
          };

        entry.podsWithMembers = Number.parseInt(
          String(row.podsWithMembers ?? '0'),
          10,
        );
        map.set(row.planCode, entry);
      },
    );

    uniqueCodes.forEach((code) => {
      if (!map.has(code)) {
        map.set(code, { totalPods: 0, podsWithMembers: 0 });
      } else {
        const entry = map.get(code)!;
        entry.totalPods = Number(entry.totalPods ?? 0);
        entry.podsWithMembers = Number(entry.podsWithMembers ?? 0);
      }
    });

    return map;
  }

  async buildSummary(plan: PodPlanEntity): Promise<AdminPodPlanSummary> {
    const usage = (await this.getUsageMap([plan.code])).get(plan.code) ?? {
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
  }
}
