import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PodDomainHelper } from '../../pod-domain.helper';
import { ListPodPlansQuery } from '../list-pod-plans.query';
import { PodPlanDefinition } from '../../pod.constants';

@QueryHandler(ListPodPlansQuery)
export class ListPodPlansHandler
  implements IQueryHandler<ListPodPlansQuery, PodPlanDefinition[]>
{
  constructor(private readonly helper: PodDomainHelper) {}

  async execute(): Promise<PodPlanDefinition[]> {
    const plans = await this.helper.getActivePlans();
    return plans.map((plan) => ({
      code: plan.code,
      amount: plan.amount,
      lifecycleWeeks: plan.lifecycleWeeks,
      maxMembers: plan.maxMembers,
      active: plan.active,
    }));
  }
}
