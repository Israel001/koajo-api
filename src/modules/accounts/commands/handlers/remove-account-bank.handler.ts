import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RemoveAccountBankCommand } from '../remove-account-bank.command';
import { AccountEntity } from '../../entities/account.entity';
import { MailService } from '../../../../common/notification/mail.service';

@Injectable()
@CommandHandler(RemoveAccountBankCommand)
export class RemoveAccountBankHandler
  implements ICommandHandler<RemoveAccountBankCommand, AccountEntity>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly mailService: MailService,
  ) {}

  async execute(
    command: RemoveAccountBankCommand,
  ): Promise<AccountEntity> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const removedAt = new Date();

    account.stripeBankAccountId = null;
    account.stripeBankAccountCustomerId = null;
    account.stripeBankAccountLinkedAt = null;
    account.stripeBankAccountUpdatedAt = null;
    account.stripeBankName = null;
    account.stripeBankAccountFirstName = null;
    account.stripeBankAccountLastName = null;

    await this.accountRepository.getEntityManager().flush();

    await this.mailService.sendBankAccountRemovalEmail({
      email: account.email,
      firstName: account.firstName ?? null,
      removedAt,
    });

    return account;
  }
}
