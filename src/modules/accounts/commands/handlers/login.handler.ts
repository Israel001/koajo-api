import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { AccountEntity } from '../../entities/account.entity';
import { EmailVerificationService } from '../../services/email-verification.service';
import {
  LoginResult,
  LoginSuccessResult,
  LoginVerificationRequiredResult,
} from '../../contracts/auth-results';
import { LoginCommand } from '../login.command';
import { ChecksumService } from '../../../../common/security/checksum.service';
import { MailService } from '../../../../common/notification/mail.service';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../domain/account.integrity';

@Injectable()
@CommandHandler(LoginCommand)
export class LoginHandler
  implements ICommandHandler<LoginCommand, LoginResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly checksumService: ChecksumService,
    private readonly mailService: MailService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatch = await argon2.verify(
      account.passwordHash,
      command.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const now = new Date();
    const lastActivity = account.lastPodJoinedAt ?? account.createdAt;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const inactivityDuration = now.getTime() - lastActivity.getTime();

    if (inactivityDuration >= ninetyDaysMs) {
      if (
        !account.inactivityClosureSentAt ||
        account.inactivityClosureSentAt.getTime() < lastActivity.getTime()
      ) {
        await this.mailService.sendAccountClosureNotice(account.email, now);
        account.inactivityClosureSentAt = now;
      }

      if (account.isActive) {
        account.deactivate(now);
      }

      account.checksum = this.checksumService.generate(
        ACCOUNT_CHECKSUM_CONTEXT,
        ...accountChecksumFields(account),
      );
      await this.accountRepository.getEntityManager().flush();
      throw new UnauthorizedException(
        'Account deactivated due to inactivity. Please contact support.',
      );
    }

    if (inactivityDuration >= sixtyDaysMs) {
      if (
        !account.inactivityWarningSentAt ||
        account.inactivityWarningSentAt.getTime() < lastActivity.getTime()
      ) {
        await this.mailService.sendAccountInactivityReminder(account.email);
        account.inactivityWarningSentAt = now;
        account.checksum = this.checksumService.generate(
          ACCOUNT_CHECKSUM_CONTEXT,
          ...accountChecksumFields(account),
        );
        await this.accountRepository.getEntityManager().flush();
      }
    }

    if (!account.isActive) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact support.',
      );
    }

    if (!account.emailVerifiedAt) {
      const verification = await this.emailVerificationService.issue(account, {
        bypassCooldown: true,
        reason: 'login',
        templateVariables: {
          firstname: account.firstName?.trim() || account.email.split('@')[0],
        },
      });

      const response: LoginVerificationRequiredResult = {
        requiresVerification: true,
        email: account.email,
        verification: {
          expiresAt: verification.expiresAt.toISOString(),
          sentAt: verification.sentAt.toISOString(),
        },
      };

      return response;
    }

    const jwtConfig = this.configService.get('auth.jwt', { infer: true })!;
    const expiresAt = new Date(
      now.getTime() + jwtConfig.accessTtlSeconds * 1000,
    );

    const payload = {
      sub: account.id,
      email: account.email,
      scope: 'user' as const,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const response: LoginSuccessResult = {
      requiresVerification: false,
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
    };

    return response;
  }
}
