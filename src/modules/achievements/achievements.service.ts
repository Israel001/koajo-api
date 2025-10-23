import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AchievementEntity } from './entities/achievement.entity';
import { AccountAchievementEntity } from './entities/account-achievement.entity';
import { AchievementCode } from './achievement-code.enum';
import type { AccountEntity } from '../accounts/entities/account.entity';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodStatus } from '../pods/pod-status.enum';
import { PaymentEntity } from '../finance/entities/payment.entity';
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
} from './achievement.helpers';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly achievementRepository: EntityRepository<AchievementEntity>,
    @InjectRepository(AccountAchievementEntity)
    private readonly accountAchievementRepository: EntityRepository<AccountAchievementEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly podMembershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
  ) {}

  async handlePodJoin(options: {
    account: AccountEntity | null | undefined;
    joinOrder: number;
    pastMembershipCount: number;
    wasEarlyBird: boolean;
  }): Promise<void> {
    const { account, joinOrder, pastMembershipCount, wasEarlyBird } = options;

    if (!account) {
      return;
    }

    if (pastMembershipCount === 0) {
      await this.award(account, AchievementCode.POD_STARTER);
    }

    if (pastMembershipCount + 1 >= 3) {
      await this.award(account, AchievementCode.COMMITMENT_CHAMP);
    }

    if (wasEarlyBird) {
      await this.award(account, AchievementCode.EARLY_BIRD);
    }
  }

  async handlePodCompletion(options: {
    account: AccountEntity | null | undefined;
    membership: PodMembershipEntity | null | undefined;
    completedPods: number;
  }): Promise<void> {
    const { account, membership, completedPods } = options;

    if (!account) {
      return;
    }

    if (completedPods >= 1) {
      const awarded = await this.award(account, AchievementCode.FINANCIALLY_FIT);

      if (awarded) {
        const ogCount = await this.accountAchievementRepository.count({
          achievement: await this.getAchievement(AchievementCode.KOAJO_OG),
        });

        if (ogCount < 1000) {
          await this.award(account, AchievementCode.KOAJO_OG);
        }
      }
    }

    if (completedPods > 10) {
      await this.award(account, AchievementCode.POD_VETERAN);
    }

    if (completedPods >= 5) {
      await this.evaluateTeamPlayer(account);
    }

    if (completedPods === 1) {
      await this.award(account, AchievementCode.FIRST_PAYOUT);
    }

    if (!membership || membership.isSystemBot || !membership.pod) {
      return;
    }

    const payments = await this.paymentRepository.find(
      { membership },
      { orderBy: { createdAt: 'ASC' } },
    );

    const snapshots: PaymentLike[] = payments.map((payment) => ({
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
    }));

    if (completedWithoutMissingContributions(membership, snapshots)) {
      await this.award(account, AchievementCode.SAVINGS_SPRINTER);
    }

    if (completedOnTime(membership, snapshots)) {
      await this.award(account, AchievementCode.ON_TIME_HERO);
    }
  }

  async handleCustomPodInviteProgress(options: {
    creator: AccountEntity | null | undefined;
    acceptedInviteCount: number;
    totalInviteCount: number;
  }): Promise<void> {
    const { creator, acceptedInviteCount, totalInviteCount } = options;

    if (!creator) {
      return;
    }

    if (acceptedInviteCount >= 1) {
      await this.award(creator, AchievementCode.KOAJO_CONNECTOR);
    }

    if (acceptedInviteCount >= 3) {
      await this.award(creator, AchievementCode.REFERRAL_MASTER);
    }

    if (totalInviteCount > 0 && acceptedInviteCount === totalInviteCount) {
      await this.award(creator, AchievementCode.POD_LEADER);
    }
  }

  async handleSuccessfulPayment(options: {
    account: AccountEntity | null | undefined;
  }): Promise<void> {
    const { account } = options;

    if (!account) {
      return;
    }

    const payments = await this.paymentRepository.find(
      { account },
      {
        orderBy: { createdAt: 'ASC' },
        populate: ['membership', 'membership.pod'] as const,
      },
    );

    const snapshots: PaymentLike[] = payments.map((payment) => ({
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      membership: payment.membership,
    }));

    await this.evaluateSavingsMilestones(account, snapshots);
    await this.evaluatePerfectStreak(account, snapshots);
  }

  private async award(account: AccountEntity, code: AchievementCode): Promise<boolean> {
    const achievement = await this.getAchievement(code);

    const existing = await this.accountAchievementRepository.findOne({
      account,
      achievement,
    });

    if (existing) {
      return false;
    }

    const entity = this.accountAchievementRepository.create(
      {
        account,
        achievement,
      },
      { partial: true },
    );

    await this.accountAchievementRepository.getEntityManager().persistAndFlush(
      entity,
    );

    return true;
  }

  private async evaluateSavingsMilestones(
    account: AccountEntity,
    payments: PaymentLike[],
  ): Promise<void> {
    const totalUnits = sumSuccessfulContributions(payments);

    if (totalUnits >= WEALTH_BUILDER_THRESHOLD_UNITS) {
      await this.award(account, AchievementCode.WEALTH_BUILDER);
    }

    if (totalUnits >= SAVINGS_CHAMPION_THRESHOLD_UNITS) {
      await this.award(account, AchievementCode.SAVINGS_CHAMPION);
    }

    if (totalUnits >= SIX_FIGURES_THRESHOLD_UNITS) {
      await this.award(account, AchievementCode.SIX_FIGURES_ROCKSTAR);
    }
  }

  private async evaluatePerfectStreak(
    account: AccountEntity,
    payments: PaymentLike[],
  ): Promise<void> {
    const streak = computeLongestMonthlyStreak(payments);
    if (streak >= PERFECT_STREAK_MIN_MONTHS) {
      await this.award(account, AchievementCode.PERFECT_STREAK);
    }
  }

  private async evaluateTeamPlayer(account: AccountEntity): Promise<void> {
    const existing = await this.accountAchievementRepository.findOne({
      account,
      achievement: await this.getAchievement(AchievementCode.TEAM_PLAYER),
    });

    if (existing) {
      return;
    }

    const memberships = await this.podMembershipRepository.find(
      {
        account,
        paidOut: true,
        isSystemBot: false,
      },
      {
        populate: ['pod', 'pod.memberships', 'pod.memberships.account'] as const,
      },
    );

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
      groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
    });

    for (const count of groupCounts.values()) {
      if (count >= 5) {
        await this.award(account, AchievementCode.TEAM_PLAYER);
        break;
      }
    }
  }

  private async getAchievement(code: AchievementCode): Promise<AchievementEntity> {
    const achievement = await this.achievementRepository.findOne({ code });

    if (!achievement) {
      throw new Error(`Achievement definition missing for code ${code}`);
    }

    return achievement;
  }
}
