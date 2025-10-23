import { AccountEntity } from '../entities/account.entity';

export const ACCOUNT_CHECKSUM_CONTEXT = 'accounts:core';

export const accountChecksumFields = (
  account: AccountEntity,
): Array<string | number> => [
  account.id,
  account.email,
  account.phoneNumber,
  account.emailVerifiedAt ? account.emailVerifiedAt.getTime() : 0,
  account.createdAt.getTime(),
  account.lastPodJoinedAt ? account.lastPodJoinedAt.getTime() : 0,
  account.avatarUrl ?? '',
  account.stripeVerificationCompleted ? 1 : 0,
  account.inactivityWarningSentAt ? account.inactivityWarningSentAt.getTime() : 0,
  account.inactivityClosureSentAt ? account.inactivityClosureSentAt.getTime() : 0,
  account.isActive ? 1 : 0,
  account.deactivatedAt ? account.deactivatedAt.getTime() : 0,
  account.emailNotificationsEnabled ? 1 : 0,
  account.transactionNotificationsEnabled ? 1 : 0,
];
