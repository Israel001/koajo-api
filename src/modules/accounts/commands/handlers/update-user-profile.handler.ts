import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateUserProfileCommand } from '../update-user-profile.command';
import { AccountEntity } from '../../entities/account.entity';
import { AccountVerificationAttemptEntity } from '../../entities/account-verification-attempt.entity';
import { EmailVerificationService } from '../../services/email-verification.service';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../domain/account.integrity';
import { UpdateUserProfileResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler
  implements
    ICommandHandler<UpdateUserProfileCommand, UpdateUserProfileResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(
    command: UpdateUserProfileCommand,
  ): Promise<UpdateUserProfileResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (command.firstName !== undefined) {
      account.firstName = command.firstName?.trim() || null;
    }

    if (command.lastName !== undefined) {
      account.lastName = command.lastName?.trim() || null;
    }

    if (command.phoneNumber !== undefined) {
      account.phoneNumber = command.phoneNumber.trim();
    }

    if (command.dateOfBirth !== undefined) {
      account.dateOfBirth = command.dateOfBirth
        ? new Date(command.dateOfBirth)
        : null;
    }

    account.agreedToTerms = true;

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    const em = this.accountRepository.getEntityManager();
    await em.persistAndFlush(account);

    let verification: UpdateUserProfileResult['verification'] = null;

    if (!account.emailVerifiedAt) {
      const issuance = await this.emailVerificationService.issue(account, {
        bypassCooldown: true,
        reason: 'profile-update',
        templateVariables: {
          firstname: account.firstName ?? account.email.split('@')[0],
        },
      });

      verification = {
        expiresAt: issuance.expiresAt.toISOString(),
        sentAt: issuance.sentAt.toISOString(),
      };
    }

    const latestAttempt = await this.verificationAttemptRepository.findOne(
      { account },
      { orderBy: { createdAt: 'DESC' } },
    );

    return {
      user: this.toCurrentUser(account, latestAttempt ?? null),
      verification,
    };
  }

  private toCurrentUser(
    account: AccountEntity,
    attempt: AccountVerificationAttemptEntity | null,
  ) {
    return {
      id: account.id,
      email: account.email,
      first_name: account.firstName ?? null,
      last_name: account.lastName ?? null,
      phone: account.phoneNumber ?? null,
      email_verified: Boolean(account.emailVerifiedAt),
      agreed_to_terms: account.agreedToTerms,
      date_of_birth: account.dateOfBirth
        ? account.dateOfBirth.toISOString().slice(0, 10)
        : null,
      avatar_id: null,
      is_active: account.isActive,
      last_login_at: account.lastLoginAt
        ? account.lastLoginAt.toISOString()
        : null,
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
      identity_verification: this.identityPayload(account, attempt),
      customer: this.customerPayload(account),
      bank_account: this.bankAccountPayload(account),
    };
  }

  private identityPayload(
    account: AccountEntity,
    attempt: AccountVerificationAttemptEntity | null,
  ) {
    if (!account.stripeIdentityId && !account.stripeIdentityResultId && !attempt) {
      return null;
    }

    return {
      id: account.stripeIdentityId ?? attempt?.providerReference ?? null,
      result_id: account.stripeIdentityResultId ?? attempt?.resultId ?? null,
      status: attempt?.status ?? null,
      type: attempt?.type ?? null,
      session_id: attempt?.sessionId ?? null,
      completed_at: attempt?.completedAt
        ? attempt.completedAt.toISOString()
        : null,
      recorded_at: attempt ? attempt.createdAt.toISOString() : null,
    };
  }

  private customerPayload(account: AccountEntity) {
    if (!account.stripeCustomerId) {
      return null;
    }

    return {
      id: account.stripeCustomerId,
      user_id: account.id,
      ssn_last4: account.stripeCustomerSsnLast4 ?? null,
      address: account.stripeCustomerAddress ?? null,
    };
  }

  private bankAccountPayload(account: AccountEntity) {
    if (!account.stripeBankAccountId) {
      return null;
    }

    return {
      id: account.stripeBankAccountId,
      customer_id:
        account.stripeBankAccountCustomerId ?? account.stripeCustomerId ?? null,
    };
  }
}
