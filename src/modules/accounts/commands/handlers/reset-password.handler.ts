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
import { ResetPasswordCommand } from '../reset-password.command';
import { PasswordResetService } from '../../services/password-reset.service';
import { ResetPasswordResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler
  implements ICommandHandler<ResetPasswordCommand, ResetPasswordResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  async execute(
    command: ResetPasswordCommand,
  ): Promise<ResetPasswordResult> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (!account.stripeVerificationCompleted) {
      throw new BadRequestException(
        'Complete Stripe verification before resetting password.',
      );
    }

    await this.passwordResetService.validate(account, command.token.trim());

    const newHash = await argon2.hash(command.newPassword, {
      type: argon2.argon2id,
    });

    account.passwordHash = newHash;

    await this.accountRepository.getEntityManager().flush();

    return {
      email: account.email,
      reset: true,
    };
  }
}
