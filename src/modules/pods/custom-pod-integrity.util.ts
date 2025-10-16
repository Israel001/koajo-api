import { ChecksumService } from '../../common/security/checksum.service';
import { PodEntity } from './entities/pod.entity';
import { PodInviteEntity } from './entities/pod-invite.entity';

export const computeCustomPodChecksum = (
  checksumService: ChecksumService,
  pod: PodEntity,
): string => {
  return checksumService.generate(
    'pods:custom',
    pod.id,
    pod.planCode,
    pod.type,
    pod.amount,
    pod.lifecycleWeeks,
    pod.maxMembers,
    pod.status,
    pod.cadence ?? '',
    pod.randomizePayoutOrder ? 1 : 0,
    pod.expectedMemberCount ?? 0,
    pod.scheduledStartDate?.toISOString() ?? '',
    pod.startDate?.toISOString() ?? '',
    pod.nextContributionDate?.toISOString() ?? '',
    pod.nextPayoutDate?.toISOString() ?? '',
  );
};

export const computeCustomInviteChecksum = (
  checksumService: ChecksumService,
  podId: string,
  invites: PodInviteEntity[],
): string => {
  const payload = invites
    .slice()
    .sort((a, b) => a.inviteOrder - b.inviteOrder)
    .map((invite) =>
      [
        invite.email,
        invite.inviteOrder,
        invite.tokenDigest,
        invite.acceptedAt?.toISOString() ?? '',
        invite.account?.id ?? '',
      ].join(':'),
    )
    .join('|');

  return checksumService.generate('pods:custom:invites', podId, payload);
};
