import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from './account.entity';

@Entity({ tableName: 'account_email_verifications' })
@Index({ properties: ['account', 'createdAt'] })
export class AccountEmailVerificationEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AccountEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  account!: AccountEntity;

  @Property({ columnType: 'varchar(128)', fieldName: 'code_digest' })
  tokenDigest!: string;

  @Property({ columnType: 'int', default: 0 })
  failedAttempts = 0;

  @Property({ columnType: 'datetime(6)' })
  expiresAt!: Date;

  @Property({ columnType: 'datetime(6)', nullable: true })
  consumedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  isExpired(reference: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= reference.getTime();
  }

  markConsumed(at: Date = new Date()) {
    this.consumedAt = at;
  }

  incrementFailedAttempt() {
    this.failedAttempts += 1;
  }
}
