import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEmailVerificationEntity } from './account-email-verification.entity';

@Entity({ tableName: 'accounts' })
export class AccountEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(320)' })
  @Unique()
  email!: string;

  @Property({ columnType: 'varchar(60)', nullable: true })
  firstName?: string | null;

  @Property({ columnType: 'varchar(60)', nullable: true })
  lastName?: string | null;

  @Property({ columnType: 'varchar(20)' })
  @Unique()
  phoneNumber!: string;

  @Property({ columnType: 'varchar(255)' })
  passwordHash!: string;

  @Property({ columnType: 'varchar(128)' })
  checksum!: string;

  @Property({ columnType: 'datetime(6)', nullable: true })
  emailVerifiedAt?: Date | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  stripeVerificationCompleted = false;

  @Property({ columnType: 'int unsigned', default: 0 })
  stripeVerificationAttemptCount = 0;

  @Property({ columnType: 'datetime(6)', nullable: true })
  stripeVerificationFirstAttemptAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  stripeVerificationLastAttemptAt?: Date | null;

  @Property({ columnType: 'varchar(64)', nullable: true })
  stripeVerificationStatus?: string | null;

  @Property({ columnType: 'tinyint(1)', default: true })
  isActive = true;

  @Property({ columnType: 'datetime(6)', nullable: true })
  lastPodJoinedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  deactivatedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  inactivityWarningSentAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  inactivityClosureSentAt?: Date | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @Property({ version: true, columnType: 'int unsigned' })
  version = 1;

  @OneToMany(
    () => AccountEmailVerificationEntity,
    (verification) => verification.account,
  )
  emailVerifications = new Collection<AccountEmailVerificationEntity>(this);


  constructor(params: {
    email: string;
    phoneNumber: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
    stripeVerificationCompleted?: boolean;
    isActive?: boolean;
    lastPodJoinedAt?: Date | null;
    deactivatedAt?: Date | null;
  }) {
    this.email = params.email.toLowerCase();
    this.phoneNumber = params.phoneNumber;
    this.passwordHash = params.passwordHash;
    this.firstName = params.firstName ?? null;
    this.lastName = params.lastName ?? null;
    if (typeof params.stripeVerificationCompleted === 'boolean') {
      this.stripeVerificationCompleted = params.stripeVerificationCompleted;
    }
    if (typeof params.isActive === 'boolean') {
      this.isActive = params.isActive;
    }
    this.lastPodJoinedAt = params.lastPodJoinedAt ?? null;
    this.deactivatedAt = params.deactivatedAt ?? null;
  }

  markEmailVerified(at: Date = new Date()) {
    this.emailVerifiedAt = at;
  }

  markStripeVerificationCompleted() {
    this.stripeVerificationCompleted = true;
  }

  updateStripeVerificationMetadata(params: {
    attemptCount?: number | null;
    firstAttemptAt?: Date | null;
    lastAttemptAt?: Date | null;
    status?: string | null;
  }) {
    if (typeof params.attemptCount === 'number') {
      this.stripeVerificationAttemptCount = Math.max(
        0,
        Math.trunc(params.attemptCount),
      );
    } else if (params.attemptCount === null) {
      this.stripeVerificationAttemptCount = 0;
    }

    if (params.firstAttemptAt instanceof Date || params.firstAttemptAt === null) {
      this.stripeVerificationFirstAttemptAt = params.firstAttemptAt ?? null;
    }

    if (params.lastAttemptAt instanceof Date || params.lastAttemptAt === null) {
      this.stripeVerificationLastAttemptAt = params.lastAttemptAt ?? null;
    }

    if (typeof params.status === 'string') {
      this.stripeVerificationStatus = params.status;
    } else if (params.status === null) {
      this.stripeVerificationStatus = null;
    }
  }

  markPodJoined(at: Date = new Date()) {
    this.lastPodJoinedAt = at;
    this.isActive = true;
    this.deactivatedAt = null;
  }

  deactivate(at: Date = new Date()) {
    this.isActive = false;
    this.deactivatedAt = at;
  }
}
