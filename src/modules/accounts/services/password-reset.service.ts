import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomBytes } from 'crypto';
import { ChecksumService } from '../../../common/security/checksum.service';
import { MailService } from '../../../common/notification/mail.service';
import { AccountPasswordResetEntity } from '../entities/account-password-reset.entity';
import { AccountEntity } from '../entities/account.entity';

interface IssueOptions {
  reason?: string;
  from?: string;
  templateVariables?: Record<string, string | number>;
}

interface IssueResult {
  expiresAt: Date;
  sentAt: Date;
}

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(AccountPasswordResetEntity)
    private readonly resetRepository: EntityRepository<AccountPasswordResetEntity>,
    private readonly checksumService: ChecksumService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async issue(
    account: AccountEntity,
    options: IssueOptions = {},
  ): Promise<IssueResult> {
    const now = new Date();
    const config = this.getPasswordResetConfig();
    const entityManager = this.resetRepository.getEntityManager();

    await this.invalidateActive(account, now);

    const token = this.generateToken();
    const digest = this.createDigest(account.id, token);
    const expiresAt = new Date(now.getTime() + config.ttlSeconds * 1000);
    const resetLink = this.buildResetLink(
      config.redirectBaseUrl,
      account.email,
      token,
    );

    const reset = this.resetRepository.create(
      {
        account,
        tokenDigest: digest,
        expiresAt,
      },
      { partial: true },
    );

    await entityManager.persistAndFlush(reset);

    const templateVariables = {
      firstname: account.firstName?.trim() || account.email.split('@')[0],
      link: resetLink,
      ...(options.templateVariables ?? {}),
    };

    await this.mailService.sendPasswordReset(
      account.email,
      resetLink,
      expiresAt,
      {
        reason: options.reason,
        from: options.from,
        variables: templateVariables,
      },
    );

    return { expiresAt, sentAt: now };
  }

  async validate(account: AccountEntity, token: string): Promise<void> {
    const now = new Date();
    const config = this.getPasswordResetConfig();
    const entityManager = this.resetRepository.getEntityManager();

    const reset = await this.resetRepository.findOne(
      { account, consumedAt: null },
      { orderBy: { createdAt: 'DESC' } },
    );

    if (!reset) {
      throw new BadRequestException(
        'No active reset link. Please request a new one.',
      );
    }

    if (reset.isExpired(now)) {
      reset.markConsumed(now);
      await entityManager.flush();
      throw new BadRequestException('Reset link has expired.');
    }

    const digest = this.createDigest(account.id, token);

    if (digest !== reset.tokenDigest) {
      reset.incrementFailedAttempt();

      if (reset.failedAttempts >= config.maxAttempts) {
        reset.markConsumed(now);
      }

      await entityManager.flush();
      throw new BadRequestException('Invalid reset link.');
    }

    reset.markConsumed(now);
    await entityManager.flush();
  }

  async invalidateActive(
    account: AccountEntity,
    at: Date = new Date(),
  ): Promise<void> {
    const entityManager = this.resetRepository.getEntityManager();
    const active = await this.resetRepository.find({
      account,
      consumedAt: null,
    });

    if (!active.length) {
      return;
    }

    for (const item of active) {
      item.markConsumed(at);
    }

    await entityManager.flush();
  }

  private getPasswordResetConfig() {
    return this.configService.get('auth.passwordReset', { infer: true })!;
  }

  private createDigest(accountId: string, token: string): string {
    return this.checksumService.generate(
      'accounts:password-reset',
      accountId,
      token,
    );
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private buildResetLink(
    baseUrl: string | undefined,
    email: string,
    token: string,
  ): string {
    const fallback = 'https://app.koajo.local/reset-password';
    const target = baseUrl?.trim() || fallback;

    try {
      const url = new URL(target);
      url.searchParams.set('token', token);
      url.searchParams.set('email', email);
      return url.toString();
    } catch {
      const separator = target.includes('?') ? '&' : '?';
      return `${target}${separator}token=${encodeURIComponent(
        token,
      )}&email=${encodeURIComponent(email)}`;
    }
  }
}
