import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../entities/account.entity';
import { ForgotPasswordCommand } from '../forgot-password.command';
import { PasswordResetService } from '../../services/password-reset.service';
import { ForgotPasswordResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler
  implements ICommandHandler<ForgotPasswordCommand, ForgotPasswordResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async execute(
    command: ForgotPasswordCommand,
  ): Promise<ForgotPasswordResult> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (account && account.stripeVerificationCompleted) {
      await this.passwordResetService.issue(account, {
        reason: 'forgot-password',
      });
    }

    return {
      email,
      requested: true,
    };
  }
}
