import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RemoveAccountBankCommand } from '../remove-account-bank.command';
import { AccountEntity } from '../../entities/account.entity';

@Injectable()
@CommandHandler(RemoveAccountBankCommand)
export class RemoveAccountBankHandler
  implements ICommandHandler<RemoveAccountBankCommand, AccountEntity>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
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

    account.stripeBankAccountId = null;
    account.stripeBankAccountCustomerId = null;
    account.stripeBankAccountLinkedAt = null;
    account.stripeBankAccountUpdatedAt = null;
    account.stripeBankName = null;
    account.stripeBankAccountFirstName = null;
    account.stripeBankAccountLastName = null;

    await this.accountRepository.getEntityManager().flush();

    return account;
  }
}
