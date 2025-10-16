import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { GetAchievementsSummaryQuery } from '../get-achievements-summary.query';
import { AchievementEntity } from '../../entities/achievement.entity';
import { AccountAchievementEntity } from '../../entities/account-achievement.entity';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';
import { AchievementsSummaryDto } from '../../dto/achievements-summary.dto';
import { AchievementCode } from '../../achievement-code.enum';

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

    const completedPods = await this.podMembershipRepository.count({
      account: query.accountId,
      paidOut: true,
      isSystemBot: false,
    });

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
        }),
        remaining: this.computeRemaining(achievement.code, {
          totalJoinedPods,
          firstJoinCount,
          completedPods,
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
    stats: {
      totalJoinedPods: number;
      firstJoinCount: number;
      completedPods: number;
    },
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
      default:
        return 0;
    }
  }

  private computeRemaining(
    code: AchievementCode,
    stats: {
      totalJoinedPods: number;
      firstJoinCount: number;
      completedPods: number;
    },
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
      default:
        return 1;
    }
  }
}
