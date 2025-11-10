import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RefreshAccessTokenCommand } from '../refresh-access-token.command';
import { ACCOUNT_REFRESH_SCOPE } from '../auth-token.constants';
import { LoginSuccessResult } from '../../contracts/auth-results';
import { AccountEntity } from '../../entities/account.entity';
import { AccountVerificationAttemptEntity } from '../../entities/account-verification-attempt.entity';
import { buildLoginUserResult } from './login-response.util';

@Injectable()
@CommandHandler(RefreshAccessTokenCommand)
export class RefreshAccessTokenHandler
  implements
    ICommandHandler<RefreshAccessTokenCommand, LoginSuccessResult>
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
  ) {}

  async execute(
    command: RefreshAccessTokenCommand,
  ): Promise<LoginSuccessResult> {
    const payload = await this.verifyRefreshToken(command.refreshToken);

    if (payload.scope !== ACCOUNT_REFRESH_SCOPE) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const account = await this.accountRepository.findOne({
      id: payload.sub,
    });

    if (!account || !account.isActive) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const jwtConfig = this.configService.get('auth.jwt', { infer: true });

    if (!jwtConfig) {
      throw new UnauthorizedException('Unable to issue access token.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + jwtConfig.accessTtlSeconds * 1000);

    const accessToken = await this.jwtService.signAsync({
      sub: account.id,
      email: account.email,
      scope: 'user' as const,
    });

    account.lastLoginAt = now;
    account.updatedAt = now;

    const latestAttempt = await this.verificationAttemptRepository.findOne(
      { account },
      { orderBy: { createdAt: 'DESC' } },
    );

    const user = buildLoginUserResult(account, latestAttempt ?? null);

    await this.accountRepository.getEntityManager().flush();

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresAt: expiresAt.toISOString(),
      refreshToken: command.refreshToken,
      refreshExpiresAt: payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : null,
      user,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; email: string; scope: string; exp?: number }> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }
}
