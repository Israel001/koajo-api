import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAccountPodsQuery } from '../list-account-pods.query';
import type { MembershipWithPod } from '../../types';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';

@QueryHandler(ListAccountPodsQuery)
export class ListAccountPodsHandler
  implements IQueryHandler<ListAccountPodsQuery, MembershipWithPod[]>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
  ) {}

  async execute(query: ListAccountPodsQuery): Promise<MembershipWithPod[]> {
    return (await this.membershipRepository.find(
      { account: query.accountId },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const,
        orderBy: { createdAt: 'DESC' },
      },
    )) as MembershipWithPod[];
  }
}
