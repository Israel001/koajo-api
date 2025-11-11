import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { PodEntity } from './pod.entity';
import { PodGoalType } from '../pod-goal.enum';

@Entity({ tableName: 'pod_memberships' })
export class PodMembershipEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => PodEntity, { nullable: false, deleteRule: 'cascade' })
  pod!: PodEntity;

  @ManyToOne(() => AccountEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  account?: AccountEntity | null;

  @Property({ columnType: 'varchar(36)' })
  publicId: string = randomUUID();

  @Property({ columnType: 'tinyint(1)', default: false })
  isSystemBot = false;

  @Property({ columnType: 'varchar(32)', default: PodGoalType.SAVINGS })
  goalType: PodGoalType = PodGoalType.SAVINGS;

  @Property({ columnType: 'varchar(255)', nullable: true })
  goalNote?: string | null;

  @Property({ columnType: 'decimal(15,2)', default: '0.00' })
  totalContributed = '0.00';

  @Property({ columnType: 'int', default: 0 })
  joinOrder = 0;

  @Property({ columnType: 'int', nullable: true })
  finalOrder?: number | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  payoutDate?: Date | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  joinedAt: Date = new Date();

  @Property({ columnType: 'tinyint(1)', default: false })
  paidOut = false;

  @Property({ columnType: 'decimal(15,2)', nullable: true })
  payoutAmount?: string | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  autoDebited = false;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
