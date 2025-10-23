import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import { GetAdminPodQuery } from '../get-admin-pod.query';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { AdminPodDetail } from '../../contracts/admin-results';
import { ListAdminPodsHandler } from './list-admin-pods.handler';

@QueryHandler(GetAdminPodQuery)
export class GetAdminPodHandler
  extends ListAdminPodsHandler
  implements IQueryHandler<GetAdminPodQuery, AdminPodDetail>
{
  constructor(
    @InjectRepository(PodEntity)
    podRepository: EntityRepository<PodEntity>,
  ) {
    super(podRepository);
  }

  async execute(query: GetAdminPodQuery): Promise<AdminPodDetail> {
    const pod = await this.podRepository.findOne(
      { id: query.podId },
      {
        populate: ['memberships', 'memberships.account', 'creator'] as const,
      },
    );

    if (!pod) {
      throw new NotFoundException('Pod not found.');
    }

    await pod.memberships.init();
    return this.toDetail(pod);
  }
}
