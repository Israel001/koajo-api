import { AccountEntity } from '../../entities/account.entity';
import { AccountVerificationAttemptEntity } from '../../entities/account-verification-attempt.entity';
import { LoginUserResult } from '../../contracts/auth-results';

export const buildLoginUserResult = (
  account: AccountEntity,
  latestAttempt: AccountVerificationAttemptEntity | null,
): LoginUserResult => {
  const identityAvailable =
    account.stripeIdentityId ||
    account.stripeIdentityResultId ||
    latestAttempt;

  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName ?? null,
    lastName: account.lastName ?? null,
    phone: account.phoneNumber ?? null,
    emailVerified: Boolean(account.emailVerifiedAt),
    agreedToTerms: account.agreedToTerms,
    dateOfBirth: serializeDateOnly(account.dateOfBirth),
    avatarId: null,
    isActive: account.isActive,
    emailNotificationsEnabled: account.emailNotificationsEnabled,
    transactionNotificationsEnabled: account.transactionNotificationsEnabled,
    lastLoginAt: account.lastLoginAt ? account.lastLoginAt.toISOString() : null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    identityVerification: identityAvailable
      ? {
          id:
            account.stripeIdentityId ??
            latestAttempt?.providerReference ??
            null,
          resultId:
            account.stripeIdentityResultId ?? latestAttempt?.resultId ?? null,
          status: latestAttempt?.status ?? null,
          type: latestAttempt?.type ?? null,
          sessionId: latestAttempt?.sessionId ?? null,
          completedAt: latestAttempt?.completedAt
            ? latestAttempt.completedAt.toISOString()
            : null,
          recordedAt: latestAttempt
            ? latestAttempt.createdAt.toISOString()
            : null,
        }
      : null,
    customer: account.stripeCustomerId
      ? {
          id: account.stripeCustomerId,
          ssnLast4: account.stripeBankAccountLast4 ?? null,
          address: account.stripeCustomerAddress ?? null,
          recipientId: account.stripeRecipientId ?? null,
          payoutStatus: account.payoutStatus ?? null,
          payoutMethodId: account.payoutMethodId ?? null,
        }
      : null,
    bankAccount: account.stripeBankAccountId
      ? {
          id: account.stripeBankAccountId,
          customerId:
            account.stripeBankAccountCustomerId ??
            account.stripeCustomerId ??
            null,
          createdAt: (
            account.stripeBankAccountLinkedAt ?? account.createdAt
          ).toISOString(),
          updatedAt: (
            account.stripeBankAccountUpdatedAt ?? account.updatedAt
          ).toISOString(),
          last4: account.stripeBankAccountLast4 ?? null,
          bankName: account.stripeBankName ?? null,
          paymentMethodId: account.stripePaymentMethodId ?? null,
          connectedAccountId: account.stripeConnectedAccountId ?? null,
        }
      : null,
  };
};

const serializeDateOnly = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};
