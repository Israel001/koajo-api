import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { GetAchievementsSummaryQuery } from '../get-achievements-summary.query';
import { AchievementEntity } from '../../entities/achievement.entity';
import { AccountAchievementEntity } from '../../entities/account-achievement.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { PodInviteEntity } from '../../../pods/entities/pod-invite.entity';
import { AchievementsSummaryDto } from '../../dto/achievements-summary.dto';
import { AchievementCode } from '../../achievement-code.enum';
import { PodType } from '../../../pods/pod-type.enum';
import { PodStatus } from '../../../pods/pod-status.enum';
import { PaymentEntity } from '../../../finance/entities/payment.entity';
import {
  PaymentLike,
  completedOnTime,
  completedWithoutMissingContributions,
  computeLongestMonthlyStreak,
  PERFECT_STREAK_MIN_MONTHS,
  SAVINGS_CHAMPION_THRESHOLD_UNITS,
  SIX_FIGURES_THRESHOLD_UNITS,
  sumSuccessfulContributions,
  WEALTH_BUILDER_THRESHOLD_UNITS,
} from '../../achievement.helpers';

type AchievementStats = {
  totalJoinedPods: number;
  firstJoinCount: number;
  completedPods: number;
  podsWithAcceptedInvites: number;
  podsWithThreeAcceptedInvites: number;
  podsWithAllInvitesAccepted: number;
  maxCompletedPodsWithSameGroup: number;
  sprinterCompletions: number;
  onTimeCompletions: number;
  totalContributionUnits: number;
  longestMonthlyStreak: number;
};

@QueryHandler(GetAchievementsSummaryQuery)
export class GetAchievementsSummaryHandler
  implements IQueryHandler<GetAchievementsSummaryQuery, AchievementsSummaryDto>
{
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly achievementRepository: EntityRepository<AchievementEntity>,
    @InjectRepository(AccountAchievementEntity)
    private readonly accountAchievementRepository: EntityRepository<AccountAchievementEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly podMembershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodInviteEntity)
    private readonly podInviteRepository: EntityRepository<PodInviteEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
  ) {}

  async execute(query: GetAchievementsSummaryQuery): Promise<AchievementsSummaryDto> {
    const [allAchievements, accountAchievements] = await Promise.all([
      this.achievementRepository.findAll(),
      this.accountAchievementRepository.find(
        { account: query.accountId },
        { populate: ['achievement'] as const, orderBy: { awardedAt: 'DESC' } },
      ),
    ]);

    const totalJoinedPods = await this.podMembershipRepository.count({
      account: query.accountId,
      isSystemBot: false,
    });

    const firstJoinCount = await this.podMembershipRepository.count({
      account: query.accountId,
      isSystemBot: false,
      joinOrder: 1,
    });

    const completedMemberships = await this.podMembershipRepository.find(
      {
        account: query.accountId,
        paidOut: true,
        isSystemBot: false,
      },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const,
      },
    );

    const payments = await this.paymentRepository.find(
      { account: query.accountId },
      {
        orderBy: { createdAt: 'ASC' },
        populate: ['membership', 'membership.pod'] as const,
      },
    );

    const paymentSnapshots: PaymentLike[] = payments.map((payment) => ({
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      membership: payment.membership,
    }));

    const paymentsByMembership = new Map<string, PaymentLike[]>();
    paymentSnapshots.forEach((snapshot) => {
      const membershipId = snapshot.membership?.id;
      if (!membershipId) {
        return;
      }

      const bucket = paymentsByMembership.get(membershipId) ?? [];
      bucket.push(snapshot);
      paymentsByMembership.set(membershipId, bucket);
    });

    const completedPods = completedMemberships.length;
    const maxCompletedPodsWithSameGroup = this.getMaxCompletedPodsWithSameGroup(
      completedMemberships,
    );

    let sprinterCompletions = 0;
    let onTimeCompletions = 0;

    completedMemberships.forEach((membership) => {
      const bucket = paymentsByMembership.get(membership.id) ?? [];

      if (completedWithoutMissingContributions(membership, bucket)) {
        sprinterCompletions += 1;
      }

      if (completedOnTime(membership, bucket)) {
        onTimeCompletions += 1;
      }
    });

    const invites = await this.podInviteRepository.find(
      {
        pod: {
          creator: query.accountId,
          type: PodType.CUSTOM,
        },
      },
      { populate: ['pod'] as const },
    );

    const {
      podsWithAcceptedInvites,
      podsWithThreeAcceptedInvites,
      podsWithAllInvitesAccepted,
    } = this.computeInviteStats(invites);

    const totalContributionUnits = sumSuccessfulContributions(paymentSnapshots);
    const longestMonthlyStreak = computeLongestMonthlyStreak(paymentSnapshots);

    const earnedAchievements = accountAchievements.map((aa) => ({
      code: aa.achievement.code,
      name: aa.achievement.name,
      description: aa.achievement.description,
      awardedAt: aa.awardedAt.toISOString(),
    }));

    const earnedCodes = new Set(earnedAchievements.map((item) => item.code));

    const pending = allAchievements
      .filter((achievement) => !earnedCodes.has(achievement.code))
      .map((achievement) => ({
        achievement,
        progress: this.computeProgress(achievement.code, {
          totalJoinedPods,
          firstJoinCount,
          completedPods,
          podsWithAcceptedInvites,
          podsWithThreeAcceptedInvites,
          podsWithAllInvitesAccepted,
          maxCompletedPodsWithSameGroup,
          sprinterCompletions,
          onTimeCompletions,
          totalContributionUnits,
          longestMonthlyStreak,
        }),
        remaining: this.computeRemaining(achievement.code, {
          totalJoinedPods,
          firstJoinCount,
          completedPods,
          podsWithAcceptedInvites,
          podsWithThreeAcceptedInvites,
          podsWithAllInvitesAccepted,
          maxCompletedPodsWithSameGroup,
          sprinterCompletions,
          onTimeCompletions,
          totalContributionUnits,
          longestMonthlyStreak,
        }),
      }))
      .sort((a, b) => a.remaining - b.remaining)
      .map((entry) => ({
        code: entry.achievement.code,
        name: entry.achievement.name,
        description: entry.achievement.description,
        progress: entry.progress,
        remaining: entry.remaining,
      }));

    return {
      totalEarned: earnedAchievements.length,
      totalAvailable: allAchievements.length,
      earned: earnedAchievements,
      pending,
    };
  }

  private computeProgress(
    code: AchievementCode,
    stats: AchievementStats,
  ): number {
    switch (code) {
      case AchievementCode.POD_STARTER:
        return Math.min(stats.totalJoinedPods / 1, 1);
      case AchievementCode.COMMITMENT_CHAMP:
        return Math.min(stats.totalJoinedPods / 3, 1);
      case AchievementCode.EARLY_BIRD:
        return Math.min(stats.firstJoinCount / 1, 1);
      case AchievementCode.FINANCIALLY_FIT:
        return Math.min(stats.completedPods / 1, 1);
      case AchievementCode.POD_VETERAN:
        return Math.min(stats.completedPods / 11, 1);
      case AchievementCode.KOAJO_OG:
        return stats.completedPods > 0 ? 1 : 0;
      case AchievementCode.KOAJO_CONNECTOR:
        return Math.min(stats.podsWithAcceptedInvites / 1, 1);
      case AchievementCode.REFERRAL_MASTER:
        return Math.min(stats.podsWithThreeAcceptedInvites / 1, 1);
      case AchievementCode.POD_LEADER:
        return Math.min(stats.podsWithAllInvitesAccepted / 1, 1);
      case AchievementCode.TEAM_PLAYER:
        return Math.min(stats.maxCompletedPodsWithSameGroup / 5, 1);
      case AchievementCode.FIRST_PAYOUT:
        return Math.min(stats.completedPods / 1, 1);
      case AchievementCode.SAVINGS_SPRINTER:
        return Math.min(stats.sprinterCompletions / 1, 1);
      case AchievementCode.WEALTH_BUILDER:
        return Math.min(
          stats.totalContributionUnits / WEALTH_BUILDER_THRESHOLD_UNITS,
          1,
        );
      case AchievementCode.SIX_FIGURES_ROCKSTAR:
        return Math.min(
          stats.totalContributionUnits / SIX_FIGURES_THRESHOLD_UNITS,
          1,
        );
      case AchievementCode.ON_TIME_HERO:
        return Math.min(stats.onTimeCompletions / 1, 1);
      case AchievementCode.PERFECT_STREAK:
        return Math.min(
          stats.longestMonthlyStreak / PERFECT_STREAK_MIN_MONTHS,
          1,
        );
      case AchievementCode.SAVINGS_CHAMPION:
        return Math.min(
          stats.totalContributionUnits / SAVINGS_CHAMPION_THRESHOLD_UNITS,
          1,
        );
      default:
        return 0;
    }
  }

  private computeRemaining(
    code: AchievementCode,
    stats: AchievementStats,
  ): number {
    switch (code) {
      case AchievementCode.POD_STARTER:
        return Math.max(1 - stats.totalJoinedPods, 0);
      case AchievementCode.COMMITMENT_CHAMP:
        return Math.max(3 - stats.totalJoinedPods, 0);
      case AchievementCode.EARLY_BIRD:
        return stats.firstJoinCount > 0 ? 0 : 1;
      case AchievementCode.FINANCIALLY_FIT:
        return Math.max(1 - stats.completedPods, 0);
      case AchievementCode.POD_VETERAN:
        return Math.max(11 - stats.completedPods, 0);
      case AchievementCode.KOAJO_OG:
        return stats.completedPods > 0 ? 0 : 1;
      case AchievementCode.KOAJO_CONNECTOR:
        return Math.max(1 - stats.podsWithAcceptedInvites, 0);
      case AchievementCode.REFERRAL_MASTER:
        return Math.max(1 - stats.podsWithThreeAcceptedInvites, 0);
      case AchievementCode.POD_LEADER:
        return Math.max(1 - stats.podsWithAllInvitesAccepted, 0);
      case AchievementCode.TEAM_PLAYER:
        return Math.max(5 - stats.maxCompletedPodsWithSameGroup, 0);
      case AchievementCode.FIRST_PAYOUT:
        return Math.max(1 - stats.completedPods, 0);
      case AchievementCode.SAVINGS_SPRINTER:
        return Math.max(1 - stats.sprinterCompletions, 0);
      case AchievementCode.WEALTH_BUILDER:
        return Math.max(
          (WEALTH_BUILDER_THRESHOLD_UNITS - stats.totalContributionUnits) / 100,
          0,
        );
      case AchievementCode.SIX_FIGURES_ROCKSTAR:
        return Math.max(
          (SIX_FIGURES_THRESHOLD_UNITS - stats.totalContributionUnits) / 100,
          0,
        );
      case AchievementCode.ON_TIME_HERO:
        return Math.max(1 - stats.onTimeCompletions, 0);
      case AchievementCode.PERFECT_STREAK:
        return Math.max(PERFECT_STREAK_MIN_MONTHS - stats.longestMonthlyStreak, 0);
      case AchievementCode.SAVINGS_CHAMPION:
        return Math.max(
          (SAVINGS_CHAMPION_THRESHOLD_UNITS - stats.totalContributionUnits) / 100,
          0,
        );
      default:
        return 1;
    }
  }

  private computeInviteStats(invites: PodInviteEntity[]): {
    podsWithAcceptedInvites: number;
    podsWithThreeAcceptedInvites: number;
    podsWithAllInvitesAccepted: number;
  } {
    const byPod = new Map<
      string,
      { total: number; accepted: number }
    >();

    invites.forEach((invite) => {
      const pod = invite.pod;
      if (!pod) {
        return;
      }

      const stats = byPod.get(pod.id) ?? { total: 0, accepted: 0 };
      stats.total += 1;
      if (invite.acceptedAt) {
        stats.accepted += 1;
      }
      byPod.set(pod.id, stats);
    });

    let podsWithAcceptedInvites = 0;
    let podsWithThreeAcceptedInvites = 0;
    let podsWithAllInvitesAccepted = 0;

    byPod.forEach(({ total, accepted }) => {
      if (accepted > 0) {
        podsWithAcceptedInvites += 1;
      }
      if (accepted >= 3) {
        podsWithThreeAcceptedInvites += 1;
      }
      if (total > 0 && accepted === total) {
        podsWithAllInvitesAccepted += 1;
      }
    });

    return {
      podsWithAcceptedInvites,
      podsWithThreeAcceptedInvites,
      podsWithAllInvitesAccepted,
    };
  }

  private getMaxCompletedPodsWithSameGroup(
    memberships: PodMembershipEntity[],
  ): number {
    const groupCounts = new Map<string, number>();

    memberships.forEach((membership) => {
      const pod = membership.pod;

      if (!pod || pod.status !== PodStatus.COMPLETED) {
        return;
      }

      const memberIds = pod.memberships
        .getItems()
        .filter((item) => !item.isSystemBot && item.account)
        .map((item) => item.account!.id)
        .sort();

      if (memberIds.length === 0) {
        return;
      }

      const key = memberIds.join('|');
      const next = (groupCounts.get(key) ?? 0) + 1;
      groupCounts.set(key, next);
    });

    let max = 0;
    groupCounts.forEach((count) => {
      if (count > max) {
        max = count;
      }
    });

    return max;
  }
}
