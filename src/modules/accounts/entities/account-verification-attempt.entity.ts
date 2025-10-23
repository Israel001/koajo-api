import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from './account.entity';

@Entity({ tableName: 'account_verification_attempts' })
export class AccountVerificationAttemptEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AccountEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  account!: AccountEntity;

  @Property({ columnType: 'varchar(64)' })
  provider!: string;

  @Property({ columnType: 'varchar(64)' })
  type!: string;

  @Property({ columnType: 'varchar(128)' })
  sessionId!: string;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeReference?: string | null;

  @Property({ columnType: 'varchar(64)' })
  status!: string;

  @Property({ columnType: 'datetime(6)', nullable: true })
  completedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
