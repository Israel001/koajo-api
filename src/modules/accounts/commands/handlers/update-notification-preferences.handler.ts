import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateNotificationPreferencesCommand } from '../update-notification-preferences.command';
import { AccountEntity } from '../../entities/account.entity';
import { ChecksumService } from '../../../../common/security/checksum.service';
import { accountChecksumFields, ACCOUNT_CHECKSUM_CONTEXT } from '../../domain/account.integrity';
import type { UpdateNotificationPreferencesResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(UpdateNotificationPreferencesCommand)
export class UpdateNotificationPreferencesHandler
  implements
    ICommandHandler<
      UpdateNotificationPreferencesCommand,
      UpdateNotificationPreferencesResult
    >
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(
    command: UpdateNotificationPreferencesCommand,
  ): Promise<UpdateNotificationPreferencesResult> {
    const hasEmailUpdate = typeof command.emailNotificationsEnabled === 'boolean';
    const hasTransactionUpdate =
      typeof command.transactionNotificationsEnabled === 'boolean';

    if (!hasEmailUpdate && !hasTransactionUpdate) {
      throw new BadRequestException('No notification preference changes supplied.');
    }

    const account = await this.accountRepository.findOne({ id: command.accountId });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (hasEmailUpdate) {
      account.emailNotificationsEnabled = command.emailNotificationsEnabled as boolean;
    }

    if (hasTransactionUpdate) {
      account.transactionNotificationsEnabled =
        command.transactionNotificationsEnabled as boolean;
    }

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    await this.accountRepository.getEntityManager().persistAndFlush(account);

    return {
      emailNotificationsEnabled: account.emailNotificationsEnabled,
      transactionNotificationsEnabled: account.transactionNotificationsEnabled,
    };
  }
}
