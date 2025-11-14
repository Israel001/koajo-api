import { AccountEntity } from '../entities/account.entity';

export const ACCOUNT_CHECKSUM_CONTEXT = 'accounts:core';

export const accountChecksumFields = (
  account: AccountEntity,
): Array<string | number> => [
  account.id,
  account.email,
  account.firstName ?? '',
  account.lastName ?? '',
  account.phoneNumber,
  account.emailVerifiedAt ? account.emailVerifiedAt.getTime() : 0,
  account.createdAt.getTime(),
  account.lastPodJoinedAt ? account.lastPodJoinedAt.getTime() : 0,
  account.avatarUrl ?? '',
  account.stripeVerificationCompleted ? 1 : 0,
  account.stripeIdentityId ?? '',
  account.stripeIdentityResultId ?? '',
  account.stripeCustomerId ?? '',
  account.stripeBankAccountId ?? '',
  account.stripeBankAccountLinkedAt
    ? account.stripeBankAccountLinkedAt.getTime()
    : 0,
  account.stripeBankAccountUpdatedAt
    ? account.stripeBankAccountUpdatedAt.getTime()
    : 0,
  account.inactivityWarningSentAt ? account.inactivityWarningSentAt.getTime() : 0,
  account.inactivityClosureSentAt ? account.inactivityClosureSentAt.getTime() : 0,
  account.isActive ? 1 : 0,
  account.deactivatedAt ? account.deactivatedAt.getTime() : 0,
  account.emailNotificationsEnabled ? 1 : 0,
  account.transactionNotificationsEnabled ? 1 : 0,
  account.agreedToTerms ? 1 : 0,
  toMillis(account.dateOfBirth),
  toMillis(account.lastLoginAt),
  account.stripeBankName ?? '',
  account.stripeBankAccountFirstName ?? '',
  account.stripeBankAccountLastName ?? '',
  account.stripeBankAccountLast4 ?? '',
  account.requiresFraudReview ? 1 : 0,
  account.fraudReviewReason ?? '',
  account.missedPaymentFlag ? 1 : 0,
  account.missedPaymentReason ?? '',
  account.overheatFlag ? 1 : 0,
  account.overheatReason ?? '',
];

const toMillis = (value: Date | string | null | undefined): number => {
  if (!value) {
    return 0;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};
