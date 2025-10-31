import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PodDomainHelper } from '../../pod-domain.helper';
import { ListOpenPodsForPlanQuery } from '../list-open-pods-for-plan.query';
import type { PodWithMembers } from '../../types';

@QueryHandler(ListOpenPodsForPlanQuery)
export class ListOpenPodsForPlanHandler
  implements IQueryHandler<ListOpenPodsForPlanQuery, PodWithMembers[]>
{
  constructor(private readonly helper: PodDomainHelper) {}

  async execute(query: ListOpenPodsForPlanQuery): Promise<PodWithMembers[]> {
    const reference = query.reference ?? new Date();
    const plan = await this.helper.getPlanOrFail(query.planCode);
    await this.helper.ensurePlanLifecycle(plan, reference);
    const pods = await this.helper.loadOpenPods(reference);
    return pods.filter((pod) => pod.planCode === plan.code);
  }
}
