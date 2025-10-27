import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { PodEntity } from './pod.entity';
import { PodMembershipEntity } from './pod-membership.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { PodActivityType } from '../pod-activity-type.enum';

@Entity({ tableName: 'pod_activities' })
export class PodActivityEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => PodEntity, { deleteRule: 'cascade' })
  pod!: PodEntity;

  @ManyToOne(() => PodMembershipEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  membership?: PodMembershipEntity | null;

  @ManyToOne(() => AccountEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  account?: AccountEntity | null;

  @Enum(() => PodActivityType)
  type!: PodActivityType;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();
}
