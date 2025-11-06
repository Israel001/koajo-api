import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../entities/account.entity';
import { EmailVerificationService } from '../../services/email-verification.service';
import { ResendVerificationResult } from '../../contracts/auth-results';
import { ResendEmailVerificationCommand } from '../resend-email-verification.command';

@Injectable()
@CommandHandler(ResendEmailVerificationCommand)
export class ResendEmailVerificationHandler
  implements
    ICommandHandler<ResendEmailVerificationCommand, ResendVerificationResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(
    command: ResendEmailVerificationCommand,
  ): Promise<ResendVerificationResult> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (account.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified.');
    }

    const verification = await this.emailVerificationService.issue(
      account,
      {
        bypassCooldown: false,
        reason: 'resend',
        redirectBaseUrl: command.redirectBaseUrl ?? undefined,
        templateVariables: {
          firstname: account.firstName?.trim() || account.email.split('@')[0],
        },
      },
    );

    return {
      email: account.email,
      verification: {
        expiresAt: verification.expiresAt.toISOString(),
        sentAt: verification.sentAt.toISOString(),
      },
    };
  }
}
