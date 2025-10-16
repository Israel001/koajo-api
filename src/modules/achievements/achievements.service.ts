import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AchievementEntity } from './entities/achievement.entity';
import { AccountAchievementEntity } from './entities/account-achievement.entity';
import { AchievementCode } from './achievement-code.enum';
import type { AccountEntity } from '../accounts/entities/account.entity';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly achievementRepository: EntityRepository<AchievementEntity>,
    @InjectRepository(AccountAchievementEntity)
    private readonly accountAchievementRepository: EntityRepository<AccountAchievementEntity>,
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
    completedPods: number;
  }): Promise<void> {
    const { account, completedPods } = options;

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

  private async getAchievement(code: AchievementCode): Promise<AchievementEntity> {
    const achievement = await this.achievementRepository.findOne({ code });

    if (!achievement) {
      throw new Error(`Achievement definition missing for code ${code}`);
    }

    return achievement;
  }
}
