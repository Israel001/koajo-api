import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { ListAdminAccountsQuery } from '../list-admin-accounts.query';
import {
  AdminAccountDetailWithBank,
  AdminAccountsListResult,
  AdminKycStatus,
  AdminAccountDetail,
} from '../../contracts/admin-results';

export const toAdminAccountDetail = (
  account: AccountEntity,
): AdminAccountDetailWithBank => ({
  id: account.id,
  email: account.email,
  phoneNumber: account.phoneNumber,
  firstName: account.firstName ?? null,
  lastName: account.lastName ?? null,
  avatarUrl: account.avatarUrl ?? null,
  createdAt: account.createdAt.toISOString(),
  isActive: account.isActive,
  emailNotificationsEnabled: account.emailNotificationsEnabled,
  transactionNotificationsEnabled: account.transactionNotificationsEnabled,
  kycStatus: deriveKycStatus(account),
  bankAccountLinked: Boolean(account.stripeBankAccountId),
  requiresFraudReview: account.requiresFraudReview,
  fraudReviewReason: account.fraudReviewReason ?? null,
  missedPaymentFlag: account.missedPaymentFlag,
  missedPaymentReason: account.missedPaymentReason ?? null,
  overheatFlag: account.overheatFlag,
  overheatReason: account.overheatReason ?? null,
  bankAccount: account.stripeBankAccountId
    ? {
        bankName: account.stripeBankName ?? null,
        paymentMethodId: account.stripePaymentMethodId ?? null,
        accountLast4: account.stripeBankAccountLast4 ?? null,
        customerId:
          account.stripeBankAccountCustomerId ??
          account.stripeCustomerId ??
          null,
        bankAccountId: account.stripeBankAccountId ?? null,
        linkedAt: account.stripeBankAccountLinkedAt
          ? account.stripeBankAccountLinkedAt.toISOString()
          : null,
        updatedAt: account.stripeBankAccountUpdatedAt
          ? account.stripeBankAccountUpdatedAt.toISOString()
          : null,
      }
    : null,
});

const deriveKycStatus = (account: AccountEntity): AdminKycStatus => {
  if (account.stripeVerificationCompleted) {
    return 'verified';
  }

  if (account.stripeIdentityId) {
    return 'pending';
  }

  return 'not_started';
};

@QueryHandler(ListAdminAccountsQuery)
export class ListAdminAccountsHandler
  implements IQueryHandler<ListAdminAccountsQuery, AdminAccountsListResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    protected readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(
    query: ListAdminAccountsQuery,
  ): Promise<AdminAccountsListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const searchTerm = query.search?.trim();

    const where = searchTerm
      ? {
          $or: [
            { email: { $like: `%${searchTerm}%` } },
            { firstName: { $like: `%${searchTerm}%` } },
            { lastName: { $like: `%${searchTerm}%` } },
          ],
        }
      : {};

    const [accounts, total] = await this.accountRepository.findAndCount(where, {
      limit,
      offset,
      orderBy: { createdAt: 'DESC' },
    });

    return {
      total,
      items: accounts.map((account) => toAdminAccountDetail(account)),
    };
  }
}
