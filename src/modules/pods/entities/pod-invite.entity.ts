import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { PodEntity } from './pod.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity({ tableName: 'pod_invites' })
export class PodInviteEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => PodEntity, { nullable: false, deleteRule: 'cascade' })
  pod!: PodEntity;

  @Property({ columnType: 'varchar(320)' })
  email!: string;

  @Property({ columnType: 'int' })
  inviteOrder = 0;

  @Property({ columnType: 'varchar(128)' })
  tokenDigest!: string;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  invitedAt: Date = new Date();

  @Property({ columnType: 'datetime(6)', nullable: true })
  acceptedAt?: Date | null;

  @ManyToOne(() => AccountEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  account?: AccountEntity | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  checksum?: string | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
