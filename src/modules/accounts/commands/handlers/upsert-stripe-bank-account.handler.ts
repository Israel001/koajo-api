import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpsertStripeBankAccountCommand } from '../upsert-stripe-bank-account.command';
import { AccountEntity } from '../../entities/account.entity';
import { UpsertStripeBankAccountResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(UpsertStripeBankAccountCommand)
export class UpsertStripeBankAccountHandler
  implements
    ICommandHandler<
      UpsertStripeBankAccountCommand,
      UpsertStripeBankAccountResult
    >
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(
    command: UpsertStripeBankAccountCommand,
  ): Promise<UpsertStripeBankAccountResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (
      account.stripeCustomerId &&
      account.stripeCustomerId !== command.customerId.trim()
    ) {
      throw new BadRequestException(
        'Provided customer identifier does not match the linked account.',
      );
    }

    account.stripeBankAccountId = command.bankAccountId.trim();
    account.stripeBankAccountCustomerId = command.customerId.trim();

    const em = this.accountRepository.getEntityManager();
    await em.persistAndFlush(account);

    return {
      id: account.stripeBankAccountId,
      customer_id: account.stripeBankAccountCustomerId,
    };
  }
}
