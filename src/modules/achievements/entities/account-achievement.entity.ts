import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { AchievementEntity } from './achievement.entity';

@Entity({ tableName: 'account_achievements' })
@Unique({ properties: ['account', 'achievement'] })
export class AccountAchievementEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AccountEntity, { nullable: false, deleteRule: 'cascade' })
  account!: AccountEntity;

  @ManyToOne(() => AchievementEntity, { nullable: false, deleteRule: 'cascade' })
  achievement!: AchievementEntity;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  awardedAt: Date = new Date();
}
