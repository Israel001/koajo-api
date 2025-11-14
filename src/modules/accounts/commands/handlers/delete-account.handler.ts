import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { DeleteAccountCommand } from '../delete-account.command';
import { AccountEntity } from '../../entities/account.entity';
import { DeleteAccountResult } from '../../contracts/auth-results';
import { PasswordResetService } from '../../services/password-reset.service';
import { EmailVerificationService } from '../../services/email-verification.service';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../domain/account.integrity';

@Injectable()
@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler
  implements ICommandHandler<DeleteAccountCommand, DeleteAccountResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<DeleteAccountResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const now = new Date();
    const scrubSuffix = account.id.replace(/-/g, '');
    const anonymizedEmail = `deleted+${scrubSuffix}@koajo.invalid`;
    const anonymizedPhone = `del-${scrubSuffix.slice(0, 16)}`;
    const randomSecret = randomBytes(32).toString('hex');

    account.email = anonymizedEmail.toLowerCase();
    account.phoneNumber = anonymizedPhone;
    account.firstName = null;
    account.lastName = null;
    account.avatarUrl = null;
    account.dateOfBirth = null;
    account.emailVerifiedAt = null;
    account.stripeVerificationCompleted = false;
    account.stripeIdentityId = null;
    account.stripeIdentityResultId = null;
    account.stripeCustomerId = null;
    account.stripeCustomerAddress = null;
    account.stripeBankAccountId = null;
    account.stripeBankAccountCustomerId = null;
    account.stripeBankAccountLinkedAt = null;
    account.stripeBankAccountUpdatedAt = null;
    account.stripeBankAccountLast4 = null;
    account.lastLoginAt = null;
    account.lastPodJoinedAt = null;
    account.inactivityWarningSentAt = null;
    account.inactivityClosureSentAt = null;
    account.emailNotificationsEnabled = false;
    account.transactionNotificationsEnabled = false;
    account.agreedToTerms = false;

    account.passwordHash = await argon2.hash(randomSecret, {
      type: argon2.argon2id,
    });

    account.deactivate(now);
    account.updatedAt = now;

    await this.emailVerificationService.invalidateActive(account, now);
    await this.passwordResetService.invalidateActive(account, now);

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    const em = this.accountRepository.getEntityManager();
    await em.persistAndFlush(account);

    return {
      success: true,
      deleted_at: now.toISOString(),
    };
  }
}
