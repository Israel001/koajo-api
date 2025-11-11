import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAccountFlagsCommand } from '../update-account-flags.command';
import { AccountEntity } from '../../entities/account.entity';

@Injectable()
@CommandHandler(UpdateAccountFlagsCommand)
export class UpdateAccountFlagsHandler
  implements ICommandHandler<UpdateAccountFlagsCommand, AccountEntity>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(
    command: UpdateAccountFlagsCommand,
  ): Promise<AccountEntity> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (
      typeof command.fraudReview === 'undefined' &&
      typeof command.missedPayment === 'undefined'
    ) {
      throw new BadRequestException(
        'No flag updates were supplied. Provide fraudReview and/or missedPayment.',
      );
    }

    if (typeof command.fraudReview !== 'undefined') {
      if (command.fraudReview) {
        account.markFraudReview(account.fraudReviewReason ?? 'manual_update');
      } else {
        account.clearFraudReview();
      }
    }

    if (typeof command.missedPayment !== 'undefined') {
      if (command.missedPayment) {
        account.flagMissedPayment(
          account.missedPaymentReason ?? 'manual_update',
        );
      } else {
        account.clearMissedPayment();
      }
    }

    await this.accountRepository.getEntityManager().flush();

    return account;
  }
}
