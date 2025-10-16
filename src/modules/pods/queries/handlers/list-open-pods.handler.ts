import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PodDomainHelper } from '../../pod-domain.helper';
import { ListOpenPodsQuery } from '../list-open-pods.query';
import type { PodWithMembers } from '../../types';

@QueryHandler(ListOpenPodsQuery)
export class ListOpenPodsHandler
  implements IQueryHandler<ListOpenPodsQuery, PodWithMembers[]>
{
  constructor(private readonly helper: PodDomainHelper) {}

  async execute(query: ListOpenPodsQuery): Promise<PodWithMembers[]> {
    const reference = query.reference ?? new Date();
    const plans = await this.helper.getActivePlans();
    for (const plan of plans) {
      await this.helper.ensurePlanLifecycle(plan, reference);
    }
    this.helper.invalidateOpenPodsCache();
    return this.helper.loadOpenPods(reference);
  }
}
