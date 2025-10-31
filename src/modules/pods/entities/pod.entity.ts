import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { PodStatus } from '../pod-status.enum';
import { PodMembershipEntity } from './pod-membership.entity';
import { PodType } from '../pod-type.enum';
import { CustomPodCadence } from '../custom-pod-cadence.enum';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity({ tableName: 'pods' })
export class PodEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(32)' })
  planCode!: string;

  @Property({ columnType: 'varchar(120)', nullable: true })
  name?: string | null;

  @Enum(() => PodType)
  type: PodType = PodType.SYSTEM;

  @ManyToOne(() => AccountEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  creator?: AccountEntity | null;

  @Property({ columnType: 'int' })
  amount!: number;

  @Property({ columnType: 'int' })
  lifecycleWeeks!: number;

  @Property({ columnType: 'int' })
  maxMembers!: number;

  @Enum(() => PodStatus)
  status: PodStatus = PodStatus.OPEN;

  @Enum({ items: () => CustomPodCadence, nullable: true })
  cadence?: CustomPodCadence | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  randomizePayoutOrder = false;

  @Property({ columnType: 'int', nullable: true })
  expectedMemberCount?: number | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  scheduledStartDate?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  startDate?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  graceEndsAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  lockedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  completedAt?: Date | null;

  @Property({ columnType: 'int', default: 0 })
  cyclesCompleted = 0;

  @Property({ columnType: 'datetime(6)', nullable: true })
  nextContributionDate?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  nextPayoutDate?: Date | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  checksum?: string | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  inviteChecksum?: string | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @OneToMany(() => PodMembershipEntity, (membership) => membership.pod, {
    orphanRemoval: true,
  })
  memberships = new Collection<PodMembershipEntity>(this);
}
