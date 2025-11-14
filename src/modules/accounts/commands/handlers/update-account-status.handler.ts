import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAccountStatusCommand } from '../update-account-status.command';
import { AccountEntity } from '../../entities/account.entity';
import {
  accountChecksumFields,
  ACCOUNT_CHECKSUM_CONTEXT,
} from '../../domain/account.integrity';
import { ChecksumService } from '../../../../common/security/checksum.service';

@Injectable()
@CommandHandler(UpdateAccountStatusCommand)
export class UpdateAccountStatusHandler
  implements ICommandHandler<UpdateAccountStatusCommand, AccountEntity>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(
    command: UpdateAccountStatusCommand,
  ): Promise<AccountEntity> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (command.isActive) {
      account.activate();
    } else {
      account.deactivate(new Date());
    }

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    await this.accountRepository.getEntityManager().flush();

    return account;
  }
}
