import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodInviteEntity } from '../../../pods/entities/pod-invite.entity';
import { ListPodPendingInvitesQuery } from '../list-pod-pending-invites.query';
import type {
  AdminPodInviteListResult,
  AdminPodInviteSummary,
} from '../../contracts/admin-results';
import { toAdminPodInviteSummary } from './list-pending-pod-invites.handler';

@QueryHandler(ListPodPendingInvitesQuery)
export class ListPodPendingInvitesHandler
  implements
    IQueryHandler<ListPodPendingInvitesQuery, AdminPodInviteListResult>
{
  constructor(
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
  ) {}

  async execute(
    query: ListPodPendingInvitesQuery,
  ): Promise<AdminPodInviteListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [invites, total] = await this.inviteRepository.findAndCount(
      { acceptedAt: null, pod: query.podId },
      {
        populate: ['pod', 'account'] as const,
        orderBy: { invitedAt: 'DESC' },
        limit,
        offset,
      },
    );

    return {
      total,
      items: invites.map((invite) => toAdminPodInviteSummary(invite)),
    };
  }
}
