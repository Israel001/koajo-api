import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomBytes } from 'crypto';
import { ChecksumService } from '../../../../common/security/checksum.service';
import { MailService } from '../../../../common/notification/mail.service';
import { CreateCustomPodCommand } from '../create-custom-pod.command';
import { PodEntity } from '../../entities/pod.entity';
import { PodInviteEntity } from '../../entities/pod-invite.entity';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { PodType } from '../../pod-type.enum';
import { PodStatus } from '../../pod-status.enum';
import { CustomPodCadence } from '../../custom-pod-cadence.enum';
import type { MembershipWithPod } from '../../types';
import { PodGoalType } from '../../pod-goal.enum';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../../accounts/domain/account.integrity';
import {
  computeCustomInviteChecksum,
  computeCustomPodChecksum,
} from '../../custom-pod-integrity.util';
import { PodActivityService } from '../../services/pod-activity.service';
import { PodActivityType } from '../../pod-activity-type.enum';
import { PodJoinGuardService } from '../../services/pod-join-guard.service';

@Injectable()
@CommandHandler(CreateCustomPodCommand)
export class CreateCustomPodHandler
  implements ICommandHandler<CreateCustomPodCommand, MembershipWithPod>
{
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodInviteEntity)
    private readonly inviteRepository: EntityRepository<PodInviteEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
    private readonly mailService: MailService,
    private readonly activityService: PodActivityService,
    private readonly joinGuard: PodJoinGuardService,
  ) {}

  async execute(
    command: CreateCustomPodCommand,
  ): Promise<MembershipWithPod> {
    const {
      creatorAccountId,
      inviteEmails,
      cadence,
      amount,
      randomizePositions,
      name,
    } =
      command;

    const creator = await this.accountRepository.findOne({
      id: creatorAccountId,
    });

    if (!creator) {
      throw new NotFoundException('Account not found.');
    }

    if (!creator.stripeVerificationCompleted) {
      throw new BadRequestException(
        'Complete Stripe verification before creating a custom pod.',
      );
    }

    this.joinGuard.ensureAccountEligible(creator);

    const normalizedEmails = this.normalizeInvites(inviteEmails, creator.email);
    const totalMembers = normalizedEmails.length + 1;

    const lifecycleWeeks =
      cadence === CustomPodCadence.BI_WEEKLY
        ? totalMembers * 2
        : totalMembers * 4;
    const trimmedName = name.trim();

    const pod = this.podRepository.create(
      {
        type: PodType.CUSTOM,
        planCode: `custom-${cadence}`,
        creator,
        name: trimmedName || null,
        amount,
        lifecycleWeeks,
        maxMembers: totalMembers,
        status: PodStatus.PENDING,
        cadence,
        randomizePayoutOrder: randomizePositions,
        expectedMemberCount: totalMembers,
        scheduledStartDate: null,
        startDate: null,
        graceEndsAt: null,
        lockedAt: null,
        completedAt: null,
        nextContributionDate: null,
        nextPayoutDate: null,
      },
      { partial: true },
    );

    const now = new Date();
    const membership = this.membershipRepository.create(
      {
        pod,
        account: creator,
        joinOrder: 1,
        isSystemBot: false,
        goalType: PodGoalType.SAVINGS,
        goalNote: null,
        joinedAt: now,
        totalContributed: '0.00',
        finalOrder: null,
        payoutDate: null,
      },
      { partial: true },
    );

    creator.markPodJoined(now);
    creator.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(creator),
    );

    const tokens: Array<{ email: string; token: string }> = [];
    const invites: PodInviteEntity[] = [];

    normalizedEmails.forEach((email, index) => {
      const token = randomBytes(32).toString('hex');
      const digest = this.checksumService.generate(
        'pods:custom:invite-token',
        token,
      );

      const invite = this.inviteRepository.create(
        {
          pod,
          email,
          inviteOrder: index + 1,
          tokenDigest: digest,
        },
        { partial: true },
      );

      invite.checksum = this.checksumService.generate(
        'pods:custom:invite',
        pod.id,
        email,
        invite.inviteOrder,
        invite.tokenDigest,
      );

      invites.push(invite);
      tokens.push({ email, token });
    });

    pod.inviteChecksum = computeCustomInviteChecksum(
      this.checksumService,
      pod.id,
      invites,
    );
    pod.checksum = computeCustomPodChecksum(this.checksumService, pod);

    const em = this.podRepository.getEntityManager();
    em.persist(pod);
    em.persist(membership);
    em.persist(creator);
    invites.forEach((invite) => em.persist(invite));
    await em.flush();

    await this.activityService.recordActivity({
      pod,
      membership,
      account: creator,
      type: PodActivityType.POD_CREATED,
      metadata: {
        cadence,
        amount,
        expectedMemberCount: totalMembers,
      },
    });

    await this.activityService.recordActivity({
      pod,
      membership,
      account: creator,
      type: PodActivityType.MEMBER_JOINED,
      metadata: {
        joinOrder: membership.joinOrder,
        source: 'creator',
      },
    });

    for (const invite of invites) {
      await this.activityService.recordActivity({
        pod,
        account: creator,
        type: PodActivityType.INVITE_SENT,
        metadata: {
          email: invite.email,
          inviteOrder: invite.inviteOrder,
        },
      });
    }

    const flagged = await this.joinGuard.evaluateRapidJoins(creator, now);
    if (flagged) {
      await em.flush();
    }

    await Promise.all(
      tokens.map(({ email, token }) =>
        this.mailService.sendCustomPodInvitation({
          email,
          inviterName:
            creator.firstName?.trim() ||
            creator.email.split('@')[0],
          podId: pod.id,
          token,
          cadence,
          amount,
          podName: trimmedName || undefined,
          originBase: command.inviteOrigin ?? undefined,
        }),
      ),
    );

    const createdMembership = (await this.membershipRepository.findOneOrFail(
      { pod, account: creator },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const,
      },
    )) as MembershipWithPod;

    return createdMembership;
  }

  private normalizeInvites(
    invites: string[],
    creatorEmail: string,
  ): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    const creator = creatorEmail.trim().toLowerCase();

    invites.forEach((rawEmail, index) => {
      const email = rawEmail.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException(
          `Invite email at position ${index + 1} is empty.`,
        );
      }

      if (email === creator) {
        throw new BadRequestException(
          'Creator email should not appear in invite list.',
        );
      }

      if (seen.has(email)) {
        throw new BadRequestException(
          `Duplicate invite email detected: ${email}`,
        );
      }

      seen.add(email);
      normalized.push(email);
    });

    return normalized;
  }

}
