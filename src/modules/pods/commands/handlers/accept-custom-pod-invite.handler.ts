import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AcceptCustomPodInviteCommand } from '../accept-custom-pod-invite.command';
import { PodInviteEntity } from '../../entities/pod-invite.entity';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { PodEntity } from '../../entities/pod.entity';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { ChecksumService } from '../../../../common/security/checksum.service';
import type { MembershipWithPod } from '../../types';
import { PodType } from '../../pod-type.enum';
import { PodStatus } from '../../pod-status.enum';
import { CustomPodCadence } from '../../custom-pod-cadence.enum';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../../accounts/domain/account.integrity';
import {
  computeCustomInviteChecksum,
  computeCustomPodChecksum,
} from '../../custom-pod-integrity.util';
import {
  addDays,
  generateCustomPayoutSchedule,
  isWithinContributionWindow,
  resolveContributionWindowStart,
  shuffle,
} from '../../pod.utils';
import { PodGoalType } from '../../pod-goal.enum';
import { AchievementService } from '../../../achievements/achievements.service';
import { PodActivityService } from '../../services/pod-activity.service';
import { PodActivityType } from '../../pod-activity-type.enum';
import { PodJoinGuardService } from '../../services/pod-join-guard.service';
import { MailService } from '../../../../common/notification/mail.service';
import { buildPodConfirmationDetails } from '../../pod-confirmation.util';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { InAppNotificationMessages } from '../../../notifications/in-app-notification.messages';

@Injectable()
@CommandHandler(AcceptCustomPodInviteCommand)
export class AcceptCustomPodInviteHandler
  implements ICommandHandler<AcceptCustomPodInviteCommand, MembershipWithPod>
{
  constructor(
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
    private readonly achievementService: AchievementService,
    private readonly activityService: PodActivityService,
    private readonly joinGuard: PodJoinGuardService,
    private readonly mailService: MailService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(
    command: AcceptCustomPodInviteCommand,
  ): Promise<MembershipWithPod> {
    const token = command.token.trim();
    if (!token) {
      throw new BadRequestException('Invalid invitation token supplied.');
    }

    const digest = this.checksumService.generate(
      'pods:custom:invite-token',
      token,
    );

    const invite = await this.inviteRepository.findOne(
      { tokenDigest: digest },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account', 'pod.creator'] as const,
      },
    );

    if (!invite) {
      throw new NotFoundException('Invitation not found or already used.');
    }

    const now = new Date();

    const pod = invite.pod;
    if (pod.type !== PodType.CUSTOM) {
      throw new BadRequestException('Invitation does not belong to a custom pod.');
    }

    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const inviteEmail = invite.email.trim().toLowerCase();
    const accountEmail = account.email.trim().toLowerCase();

    if (inviteEmail !== accountEmail) {
      throw new BadRequestException('Invitation token does not match this account.');
    }

    if (!account.stripeVerificationCompleted) {
      throw new BadRequestException(
        'Complete Stripe verification before joining this custom pod.',
      );
    }

    this.joinGuard.ensureAccountEligible(account);

    if (invite.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted.');
    }

    const existingMembership = pod.memberships
      .getItems()
      .find((membership) => membership.account?.id === account.id);

    if (existingMembership) {
      throw new BadRequestException('Account already joined this pod.');
    }

    const expected = pod.expectedMemberCount ?? pod.maxMembers;
    if (!expected) {
      throw new BadRequestException('Custom pod configuration is invalid.');
    }

    const currentCount = pod.memberships.length;
    if (currentCount >= expected) {
      throw new BadRequestException('Pod is already at maximum capacity.');
    }

    const membership = this.membershipRepository.create(
      {
        pod,
        account,
        joinOrder: currentCount + 1,
        joinedAt: now,
        goalType: PodGoalType.SAVINGS,
        goalNote: null,
        totalContributed: '0.00',
      },
      { partial: true },
    );

    pod.memberships.add(membership);

    invite.acceptedAt = now;
    invite.account = account;

    account.markPodJoined(now);
    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    const em = this.inviteRepository.getEntityManager();
    em.persist(account);
    em.persist(invite);
    em.persist(membership);

    const invites = await this.inviteRepository.find(
      { pod },
      { orderBy: { inviteOrder: 'ASC' }, populate: ['account'] as const },
    );

    const acceptedInviteCount = invites.filter(
      (item) => !!item.acceptedAt,
    ).length;

    await this.achievementService.handleCustomPodInviteProgress({
      creator: pod.creator,
      acceptedInviteCount,
      totalInviteCount: invites.length,
    });

    const allAccepted = invites.every((item) => item.acceptedAt);

    let activationDetails: { startDate: Date | null } | null = null;

    if (allAccepted && pod.cadence) {
      activationDetails = this.finalizePod(pod, invites, now);
    } else {
      pod.checksum = computeCustomPodChecksum(this.checksumService, pod);
    }

    pod.inviteChecksum = computeCustomInviteChecksum(
      this.checksumService,
      pod.id,
      invites,
    );

    em.persist(pod);
    await em.flush();

    await this.activityService.recordActivity({
      pod,
      membership,
      account,
      type: PodActivityType.MEMBER_JOINED,
      metadata: {
        joinOrder: membership.joinOrder,
        source: 'invite',
      },
    });

    if (activationDetails) {
      await this.activityService.recordActivity({
        pod,
        membership: null,
        account: pod.creator ?? null,
        type: PodActivityType.POD_ACTIVATED,
        metadata: {
          startDate: activationDetails.startDate
            ? activationDetails.startDate.toISOString()
            : null,
          lockedAt: now.toISOString(),
          cadence: pod.cadence,
        },
      });
    }

    const flagged = await this.joinGuard.evaluateRapidJoins(account, now);
    if (flagged) {
      await em.flush();
    }

    await this.activityService.recordActivity({
      pod,
      membership,
      account,
      type: PodActivityType.INVITE_ACCEPTED,
      metadata: {
        email: invite.email,
        inviteOrder: invite.inviteOrder,
      },
    });

    const createdMembership = (await this.membershipRepository.findOneOrFail(
      { pod, account },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const,
      },
    )) as MembershipWithPod;

    const confirmation = buildPodConfirmationDetails(pod);
    await this.mailService.sendPodJoinConfirmationEmail({
      email: account.email,
      firstName: account.firstName ?? account.email.split('@')[0],
      podAmount: confirmation.podAmount,
      podMembers: confirmation.podMembers,
      podCycle: confirmation.podCycle,
      isCustom: confirmation.isCustom,
    });

    await this.inAppNotificationService.createNotification(
      account,
      InAppNotificationMessages.joinedPod(),
    );

    return createdMembership;
  }

  private finalizePod(
    pod: PodEntity,
    invites: PodInviteEntity[],
    activationTime: Date,
  ): { startDate: Date | null } {
    const cadence = pod.cadence as CustomPodCadence;
    const withinWindow = isWithinContributionWindow(activationTime, cadence);
    const contributionStart = withinWindow
      ? resolveContributionWindowStart(activationTime, cadence)
      : resolveContributionWindowStart(addDays(activationTime, 1), cadence);

    const payoutSchedule = generateCustomPayoutSchedule(
      cadence,
      contributionStart,
      pod.memberships.length,
    );

    pod.status = PodStatus.ACTIVE;
    pod.scheduledStartDate = contributionStart;
    pod.startDate = contributionStart;
    pod.lockedAt = activationTime;
    pod.nextContributionDate = contributionStart;
    pod.nextPayoutDate = payoutSchedule[0] ?? null;
    pod.completedAt = null;

    const memberships = pod.memberships.getItems();
    const ordered = this.determinePayoutOrder(pod, invites, memberships);

    ordered.forEach((member, index) => {
      member.finalOrder = index + 1;
      member.payoutDate = payoutSchedule[index] ?? null;
    });

    pod.checksum = computeCustomPodChecksum(this.checksumService, pod);

    return { startDate: pod.startDate ?? null };
  }

  private determinePayoutOrder(
    pod: PodEntity,
    invites: PodInviteEntity[],
    memberships: PodMembershipEntity[],
  ): PodMembershipEntity[] {
    if (pod.randomizePayoutOrder) {
      return shuffle(memberships);
    }

    const inviteOrderMap = new Map<string, number>();
    invites.forEach((invite) => {
      inviteOrderMap.set(invite.email.trim().toLowerCase(), invite.inviteOrder);
    });

    const creatorId = pod.creator?.id ?? null;

    return memberships.slice().sort((a, b) => {
      const aScore = this.payoutScoreForMember(a, creatorId, inviteOrderMap);
      const bScore = this.payoutScoreForMember(b, creatorId, inviteOrderMap);
      return aScore - bScore;
    });
  }

  private payoutScoreForMember(
    membership: PodMembershipEntity,
    creatorId: string | null,
    inviteOrderMap: Map<string, number>,
  ): number {
    if (membership.account?.id === creatorId) {
      return 0;
    }
    const email = membership.account?.email.trim().toLowerCase() ?? '';
    const inviteOrder = inviteOrderMap.get(email);
    if (inviteOrder !== undefined) {
      return inviteOrder;
    }
    return Number.MAX_SAFE_INTEGER / 2 + (membership.joinOrder ?? 0);
  }
}
