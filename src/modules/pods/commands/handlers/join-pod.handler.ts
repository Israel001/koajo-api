import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JoinPodCommand } from '../join-pod.command';
import type { MembershipWithPod, PodWithMembers } from '../../types';
import { PodDomainHelper } from '../../pod-domain.helper';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { PodEntity } from '../../entities/pod.entity';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { POD_OPEN_STATUSES } from '../../pod.constants';
import { PodGoalType } from '../../pod-goal.enum';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../../accounts/domain/account.integrity';
import { AchievementService } from '../../../achievements/achievements.service';
import { PodActivityService } from '../../services/pod-activity.service';
import { PodActivityType } from '../../pod-activity-type.enum';
import { PodJoinGuardService } from '../../services/pod-join-guard.service';

@CommandHandler(JoinPodCommand)
export class JoinPodHandler
  implements ICommandHandler<JoinPodCommand, MembershipWithPod>
{
  constructor(
    private readonly helper: PodDomainHelper,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
    private readonly achievementService: AchievementService,
    private readonly activityService: PodActivityService,
    private readonly joinGuard: PodJoinGuardService,
  ) {}

  async execute(command: JoinPodCommand): Promise<MembershipWithPod> {
    const { accountId, planCode, goal, goalNote } = command;
    const now = new Date();

    if (goal === PodGoalType.OTHER && (!goalNote || !goalNote.trim())) {
      throw new BadRequestException(
        'A goal description is required when selecting other.',
      );
    }

    const account = await this.accountRepository.findOne({ id: accountId });
    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (!account.stripeVerificationCompleted) {
      throw new BadRequestException(
        'Complete Stripe verification before joining a pod.',
      );
    }

    this.joinGuard.ensureAccountEligible(account);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - sevenDaysMs);
    const recentJoinCount = await this.membershipRepository.count({
      account,
      isSystemBot: false,
      joinedAt: { $gte: sevenDaysAgo },
    });

    if (recentJoinCount >= 3) {
      const latestJoin = await this.membershipRepository.findOne(
        { account, isSystemBot: false },
        { orderBy: { joinedAt: 'DESC' } },
      );

      if (
        latestJoin &&
        now.getTime() <
          latestJoin.joinedAt.getTime() + sevenDaysMs
      ) {
        const availableAt = new Date(
          latestJoin.joinedAt.getTime() + sevenDaysMs,
        );
        throw new BadRequestException(
          `Join cooldown active. You can join another pod after ${availableAt.toISOString()}.`,
        );
      }
    }

    const plan = await this.helper.getPlanOrFail(planCode);

    await this.helper.ensurePlanLifecycle(plan, now);

    let pod = (await this.podRepository.findOne(
      { planCode: plan.code, status: { $in: POD_OPEN_STATUSES } },
      { populate: ['memberships', 'memberships.account'] as const },
    )) as PodWithMembers | null;

    if (!pod) {
      await this.helper.ensurePlanLifecycle(plan, now);
      pod = (await this.podRepository.findOne(
        { planCode: plan.code, status: { $in: POD_OPEN_STATUSES } },
        { populate: ['memberships', 'memberships.account'] as const },
      )) as PodWithMembers | null;

      if (!pod) {
        throw new NotFoundException('No open pod available for this plan.');
      }
    }

    await pod.memberships.init();

    const existingMembership = await this.membershipRepository.findOne({
      pod,
      account,
    });

    if (existingMembership) {
      throw new BadRequestException('Account already joined this pod.');
    }

    if (pod.memberships.length >= plan.maxMembers) {
      throw new BadRequestException('Pod is already full.');
    }

    const membership = this.membershipRepository.create(
      {
        pod,
        account,
        isSystemBot: false,
        joinOrder: pod.memberships.length + 1,
        joinedAt: now,
        goalType: goal,
        goalNote: goal === PodGoalType.OTHER ? goalNote?.trim() ?? null : null,
        totalContributed: '0.00',
      },
      { partial: true },
    );

    const em = this.membershipRepository.getEntityManager();
    account.markPodJoined(now);
    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );
    await em.persistAndFlush(membership);
    const flagged = await this.joinGuard.evaluateRapidJoins(account, now);
    if (flagged) {
      await em.flush();
    }

    await this.activityService.recordActivity({
      pod,
      membership,
      account,
      type: PodActivityType.MEMBER_JOINED,
      metadata: {
        joinOrder: membership.joinOrder,
        goalType: membership.goalType,
      },
    });

    const membershipCount = await this.membershipRepository.count({
      account,
    });

    const pastMembershipCount = Math.max(membershipCount - 1, 0);

    await this.achievementService.handlePodJoin({
      account,
      joinOrder: membership.joinOrder,
      pastMembershipCount,
      wasEarlyBird: membership.joinOrder === 1,
    });

    await this.helper.ensurePlanLifecycle(plan, now);
    this.helper.invalidateOpenPodsCache();

    const loaded = await this.membershipRepository.findOneOrFail(
      { id: membership.id },
      { populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const },
    );

    return loaded as MembershipWithPod;
  }
}
