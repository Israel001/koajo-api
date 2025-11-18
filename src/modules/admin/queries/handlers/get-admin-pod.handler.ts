import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import { GetAdminPodQuery } from '../get-admin-pod.query';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { AdminPodDetail, AdminPodInviteSummary } from '../../contracts/admin-results';
import { toAdminPodDetail } from './list-admin-pods.handler';
import { PodInviteEntity } from '../../../pods/entities/pod-invite.entity';
import { toAdminPodInviteSummary } from './list-pending-pod-invites.handler';
import { PodType } from '../../../pods/pod-type.enum';

@QueryHandler(GetAdminPodQuery)
export class GetAdminPodHandler
  implements IQueryHandler<GetAdminPodQuery, AdminPodDetail>
{
  constructor(
    @InjectRepository(PodEntity)
    podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
  ) {
    this.podRepository = podRepository;
  }

  private readonly podRepository: EntityRepository<PodEntity>;

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
    let pendingInvites: AdminPodInviteSummary[] = [];

    if (pod.type === PodType.CUSTOM) {
      const invites = await this.inviteRepository.find(
        { pod, acceptedAt: null },
        { populate: ['pod', 'account'] as const, orderBy: { invitedAt: 'DESC' } },
      );
      pendingInvites = invites.map((invite) => toAdminPodInviteSummary(invite));
    }

    return toAdminPodDetail(pod, pendingInvites);
  }
}
