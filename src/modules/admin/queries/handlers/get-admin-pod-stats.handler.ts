import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { GetAdminPodStatsQuery } from '../get-admin-pod-stats.query';
import { PodEntity } from '../../../pods/entities/pod.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { PodInviteEntity } from '../../../pods/entities/pod-invite.entity';
import { AdminPodStatistics } from '../../contracts/admin-results';
import { PodStatus } from '../../../pods/pod-status.enum';

@QueryHandler(GetAdminPodStatsQuery)
export class GetAdminPodStatsHandler
  implements IQueryHandler<GetAdminPodStatsQuery, AdminPodStatistics>
{
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
  ) {}

  async execute(_: GetAdminPodStatsQuery): Promise<AdminPodStatistics> {
    const [openPods, totalMembers, pendingInvites, incompletePods] =
      await Promise.all([
        this.podRepository.count({ status: PodStatus.OPEN }),
        this.membershipRepository.count({
          account: { $ne: null },
          isSystemBot: false,
        }),
        this.inviteRepository.count({ acceptedAt: null }),
        this.podRepository.count({ status: { $ne: PodStatus.COMPLETED } }),
      ]);

    return {
      totalOpenPods: openPods,
      totalMembers,
      totalPendingInvites: pendingInvites,
      totalIncompletePods: incompletePods,
    };
  }
}
