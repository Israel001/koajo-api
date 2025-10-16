import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { AccountEntity } from '../../entities/account.entity';
import { ChangePasswordCommand } from '../change-password.command';
import { ChangePasswordResult } from '../../contracts/auth-results';
import { MailService } from '../../../../common/notification/mail.service';

@Injectable()
@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler
  implements
    ICommandHandler<ChangePasswordCommand, ChangePasswordResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly mailService: MailService,
  ) {}

  async execute(
    command: ChangePasswordCommand,
  ): Promise<ChangePasswordResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const currentPasswordMatches = await argon2.verify(
      account.passwordHash,
      command.currentPassword,
    );

    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    if (
      await argon2.verify(account.passwordHash, command.newPassword)
    ) {
      throw new BadRequestException(
        'New password must be different from the current password.',
      );
    }

    const newHash = await argon2.hash(command.newPassword, {
      type: argon2.argon2id,
    });

    account.passwordHash = newHash;

    await this.accountRepository.getEntityManager().flush();

    const firstname = account.firstName ?? account.email.split('@')[0];
    await this.mailService.sendPasswordChangedEmail(account.email, firstname);

    return { success: true };
  }
}
