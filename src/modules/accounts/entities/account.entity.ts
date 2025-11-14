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

  @Property({ columnType: 'varchar(512)', nullable: true })
  avatarUrl?: string | null;

  @Property({ columnType: 'varchar(120)', nullable: true })
  stripeBankName?: string | null;

  @Property({ columnType: 'varchar(120)', nullable: true })
  stripeBankAccountFirstName?: string | null;

  @Property({ columnType: 'varchar(120)', nullable: true })
  stripeBankAccountLastName?: string | null;

  @Property({ columnType: 'date', nullable: true })
  dateOfBirth?: Date | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  agreedToTerms = false;

  @Property({ columnType: 'varchar(128)' })
  checksum!: string;

  @Property({ columnType: 'datetime(6)', nullable: true })
  emailVerifiedAt?: Date | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  stripeVerificationCompleted = false;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeIdentityId?: string | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeIdentityResultId?: string | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeCustomerId?: string | null;

  @Property({ type: 'json', nullable: true })
  stripeCustomerAddress?: Record<string, unknown> | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeBankAccountId?: string | null;

  @Property({ columnType: 'varchar(128)', nullable: true })
  stripeBankAccountCustomerId?: string | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  stripeBankAccountLinkedAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  stripeBankAccountUpdatedAt?: Date | null;

  @Property({ columnType: 'varchar(4)', nullable: true })
  stripeBankAccountLast4?: string | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  requiresFraudReview = false;

  @Property({ columnType: 'varchar(64)', nullable: true })
  fraudReviewReason?: string | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  missedPaymentFlag = false;

  @Property({ columnType: 'varchar(128)', nullable: true })
  missedPaymentReason?: string | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  overheatFlag = false;

  @Property({ columnType: 'varchar(128)', nullable: true })
  overheatReason?: string | null;

  @Property({ columnType: 'tinyint(1)', default: true })
  isActive = true;

  @Property({ columnType: 'tinyint(1)', default: true })
  emailNotificationsEnabled = true;

  @Property({ columnType: 'tinyint(1)', default: true })
  transactionNotificationsEnabled = true;

  @Property({ columnType: 'datetime(6)', nullable: true })
  lastLoginAt?: Date | null;

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


  constructor(params?: {
    email: string;
    phoneNumber: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    stripeVerificationCompleted?: boolean;
    isActive?: boolean;
    lastPodJoinedAt?: Date | null;
    deactivatedAt?: Date | null;
    emailNotificationsEnabled?: boolean;
    transactionNotificationsEnabled?: boolean;
  }) {
    if (!params) {
      return;
    }

    if (typeof params.email === 'string') {
      this.email = params.email.toLowerCase();
    }
    if (typeof params.phoneNumber === 'string') {
      this.phoneNumber = params.phoneNumber;
    }
    if (typeof params.passwordHash === 'string') {
      this.passwordHash = params.passwordHash;
    }
    if ('firstName' in params) {
      this.firstName = params.firstName ?? null;
    }
    if ('lastName' in params) {
      this.lastName = params.lastName ?? null;
    }
    if ('avatarUrl' in params) {
      this.avatarUrl = params.avatarUrl ?? null;
    }
    if (typeof params.stripeVerificationCompleted === 'boolean') {
      this.stripeVerificationCompleted = params.stripeVerificationCompleted;
    }
    if (typeof params.isActive === 'boolean') {
      this.isActive = params.isActive;
    }
    if (typeof params.emailNotificationsEnabled === 'boolean') {
      this.emailNotificationsEnabled = params.emailNotificationsEnabled;
    }
    if (typeof params.transactionNotificationsEnabled === 'boolean') {
      this.transactionNotificationsEnabled =
        params.transactionNotificationsEnabled;
    }
    if ('lastPodJoinedAt' in params) {
      this.lastPodJoinedAt = params.lastPodJoinedAt ?? null;
    }
    if ('deactivatedAt' in params) {
      this.deactivatedAt = params.deactivatedAt ?? null;
    }
  }

  markEmailVerified(at: Date = new Date()) {
    this.emailVerifiedAt = at;
  }

  markStripeVerificationCompleted() {
    this.stripeVerificationCompleted = true;
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

  activate(at: Date = new Date()) {
    this.isActive = true;
    this.deactivatedAt = null;
    this.lastPodJoinedAt = this.lastPodJoinedAt ?? at;
  }

  markFraudReview(reason: string): void {
    this.requiresFraudReview = true;
    this.fraudReviewReason = reason;
  }

  clearFraudReview(): void {
    this.requiresFraudReview = false;
    this.fraudReviewReason = null;
  }

  flagMissedPayment(reason: string): void {
    this.missedPaymentFlag = true;
    this.missedPaymentReason = reason;
  }

  clearMissedPayment(): void {
    this.missedPaymentFlag = false;
    this.missedPaymentReason = null;
  }

  markOverheat(reason: string): void {
    this.overheatFlag = true;
    this.overheatReason = reason;
  }

  clearOverheat(): void {
    this.overheatFlag = false;
    this.overheatReason = null;
  }
}
