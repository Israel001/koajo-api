import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomBytes } from 'crypto';
import { ChecksumService } from '../../../common/security/checksum.service';
import { MailService } from '../../../common/notification/mail.service';
import { AccountEmailVerificationEntity } from '../entities/account-email-verification.entity';
import { AccountEntity } from '../entities/account.entity';

interface IssueOptions {
  bypassCooldown?: boolean;
  reason?: string;
  from?: string;
  templateVariables?: Record<string, string | number>;
  redirectBaseUrl?: string | null;
}

interface IssueResult {
  expiresAt: Date;
  sentAt: Date;
}

@Injectable()
export class EmailVerificationService {
  constructor(
    @InjectRepository(AccountEmailVerificationEntity)
    private readonly verificationRepository: EntityRepository<AccountEmailVerificationEntity>,
    private readonly checksumService: ChecksumService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async issue(
    account: AccountEntity,
    options: IssueOptions = {},
  ): Promise<IssueResult> {
    const now = new Date();
    const config = this.getEmailVerificationConfig();
    const entityManager = this.verificationRepository.getEntityManager();

    if (!options.bypassCooldown) {
      const recent = await this.verificationRepository.findOne(
        { account },
        { orderBy: { createdAt: 'DESC' } },
      );

      if (
        recent &&
        now.getTime() - recent.createdAt.getTime() <
          config.resendCooldownSeconds * 1000
      ) {
        throw new BadRequestException(
          `Verification email recently sent. Please wait ${config.resendCooldownSeconds} seconds before requesting a new one.`,
        );
      }
    }

    await this.invalidateActive(account, now);

    const token = this.generateToken();
    const digest = this.createDigest(account.id, token);
    const expiresAt = new Date(now.getTime() + config.ttlSeconds * 1000);
    const verificationLink = this.buildVerificationLink(
      options.redirectBaseUrl ?? config.redirectBaseUrl,
      account.email,
      token,
    );

    const verification = this.verificationRepository.create(
      {
        account,
        tokenDigest: digest,
        expiresAt,
      },
      { partial: true },
    );

    await entityManager.persistAndFlush(verification);

    const templateVariables = {
      firstname: account.firstName?.trim() || account.email.split('@')[0],
      link: verificationLink,
      ...(options.templateVariables ?? {}),
    };

    await this.mailService.sendEmailVerification(account.email, verificationLink, expiresAt, {
      reason: options.reason,
      from: options.from,
      variables: templateVariables,
    });

    return { expiresAt, sentAt: now };
  }

  async verify(account: AccountEntity, token: string): Promise<void> {
    const now = new Date();
    const config = this.getEmailVerificationConfig();
    const entityManager = this.verificationRepository.getEntityManager();

    const verification = await this.verificationRepository.findOne(
      { account, consumedAt: null },
      { orderBy: { createdAt: 'DESC' } },
    );

    if (!verification) {
      throw new BadRequestException(
        'No active verification link. Please request a new one.',
      );
    }

    if (verification.isExpired(now)) {
      verification.markConsumed(now);
      await entityManager.flush();
      throw new BadRequestException('Verification link has expired.');
    }

    const digest = this.createDigest(account.id, token);

    if (digest !== verification.tokenDigest) {
      verification.incrementFailedAttempt();

      if (verification.failedAttempts >= config.maxAttempts) {
        verification.markConsumed(now);
      }

      await entityManager.flush();
      throw new BadRequestException('Invalid verification link.');
    }

    verification.markConsumed(now);
    await entityManager.flush();
  }

  async invalidateActive(
    account: AccountEntity,
    at: Date = new Date(),
  ): Promise<void> {
    const entityManager = this.verificationRepository.getEntityManager();
    const active = await this.verificationRepository.find({
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

  private getEmailVerificationConfig() {
    return this.configService.get('auth.emailVerification', { infer: true })!;
  }

  private createDigest(accountId: string, token: string): string {
    return this.checksumService.generate(
      'accounts:email-verification',
      accountId,
      token,
    );
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private buildVerificationLink(
    baseUrl: string | undefined,
    email: string,
    token: string,
  ): string {
    const fallback = 'https://koajo.com/register/verify-email';
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
