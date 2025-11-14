import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpsertStripeCustomerCommand } from '../upsert-stripe-customer.command';
import { AccountEntity } from '../../entities/account.entity';
import { UpsertStripeCustomerResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(UpsertStripeCustomerCommand)
export class UpsertStripeCustomerHandler
  implements
    ICommandHandler<UpsertStripeCustomerCommand, UpsertStripeCustomerResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(
    command: UpsertStripeCustomerCommand,
  ): Promise<UpsertStripeCustomerResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    account.stripeCustomerId = command.stripeCustomerId.trim();
    account.stripeCustomerAddress = command.address ?? null;

    const em = this.accountRepository.getEntityManager();
    await em.persistAndFlush(account);

    return {
      id: account.stripeCustomerId,
      ssn_last4: account.stripeBankAccountLast4 ?? null,
      address: account.stripeCustomerAddress ?? null,
    };
  }
}
