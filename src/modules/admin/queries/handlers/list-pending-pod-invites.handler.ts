import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListPendingPodInvitesQuery } from '../list-pending-pod-invites.query';
import { PodInviteEntity } from '../../../pods/entities/pod-invite.entity';
import type {
  AdminPodInviteListResult,
  AdminPodInviteSummary,
} from '../../contracts/admin-results';

export const toAdminPodInviteSummary = (
  invite: PodInviteEntity,
): AdminPodInviteSummary => ({
  id: invite.id,
  podId: invite.pod.id,
  podPlanCode: invite.pod.planCode,
  podName: invite.pod.name ?? null,
  email: invite.email,
  inviteOrder: invite.inviteOrder,
  invitedAt: invite.invitedAt.toISOString(),
  acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
  accountId: invite.account?.id ?? null,
});

@QueryHandler(ListPendingPodInvitesQuery)
export class ListPendingPodInvitesHandler
  implements IQueryHandler<ListPendingPodInvitesQuery, AdminPodInviteListResult>
{
  constructor(
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
  ) {}

  async execute(
    query: ListPendingPodInvitesQuery,
  ): Promise<AdminPodInviteListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [invites, total] = await this.inviteRepository.findAndCount(
      { acceptedAt: null },
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
