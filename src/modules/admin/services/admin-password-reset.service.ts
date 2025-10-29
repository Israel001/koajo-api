import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomBytes } from 'crypto';
import { ChecksumService } from '../../../common/security/checksum.service';
import { MailService } from '../../../common/notification/mail.service';
import { AdminPasswordResetEntity } from '../entities/admin-password-reset.entity';
import { AdminUserEntity } from '../entities/admin-user.entity';

interface IssueOptions {
  reason?: string;
  from?: string;
  templateCode?: string;
}

interface IssueResult {
  expiresAt: Date;
  sentAt: Date;
  token: string;
}

@Injectable()
export class AdminPasswordResetService {
  private static readonly CHECKSUM_CONTEXT = 'admin:password-reset';

  constructor(
    @InjectRepository(AdminPasswordResetEntity)
    private readonly resetRepository: EntityRepository<AdminPasswordResetEntity>,
    private readonly checksumService: ChecksumService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async issue(
    admin: AdminUserEntity,
    options: IssueOptions = {},
  ): Promise<IssueResult> {
    const now = new Date();
    const config = this.getPasswordResetConfig();
    const em = this.resetRepository.getEntityManager();

    await this.invalidateActive(admin, now);

    const token = this.generateToken();
    const digest = this.createDigest(admin.id, token);
    const expiresAt = new Date(now.getTime() + config.ttlSeconds * 1000);

    const reset = this.resetRepository.create(
      {
        admin,
        tokenDigest: digest,
        expiresAt,
      },
      { partial: true },
    );

    await em.persistAndFlush(reset);

    const resetLink = this.buildResetLink(
      config.redirectBaseUrl,
      admin.email,
      token,
    );

    await this.mailService.sendPasswordReset(admin.email, resetLink, expiresAt, {
      reason: options.reason ?? 'admin-forgot-password',
      from: options.from,
      variables: {
        firstname: admin.firstName ?? admin.email.split('@')[0],
      },
    });

    return { expiresAt, sentAt: now, token };
  }

  async validate(admin: AdminUserEntity, token: string): Promise<void> {
    const now = new Date();
    const config = this.getPasswordResetConfig();
    const em = this.resetRepository.getEntityManager();

    const reset = await this.resetRepository.findOne(
      { admin, consumedAt: null },
      { orderBy: { createdAt: 'DESC' } },
    );

    if (!reset) {
      throw new BadRequestException(
        'No active reset link. Please request a new one.',
      );
    }

    if (reset.isExpired(now)) {
      reset.markConsumed(now);
      await em.flush();
      throw new BadRequestException('Reset link has expired.');
    }

    const digest = this.createDigest(admin.id, token);

    if (digest !== reset.tokenDigest) {
      reset.incrementFailedAttempt();

      if (reset.failedAttempts >= config.maxAttempts) {
        reset.markConsumed(now);
      }

      await em.flush();
      throw new BadRequestException('Invalid reset link.');
    }

    reset.markConsumed(now);
    await em.flush();
  }

  async invalidateActive(
    admin: AdminUserEntity,
    at: Date = new Date(),
  ): Promise<void> {
    const em = this.resetRepository.getEntityManager();
    const active = await this.resetRepository.find({
      admin,
      consumedAt: null,
    });

    if (!active.length) {
      return;
    }

    for (const reset of active) {
      reset.markConsumed(at);
    }

    await em.flush();
  }

  private getPasswordResetConfig() {
    return this.configService.get('auth.passwordReset', { infer: true })!;
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private createDigest(adminId: string, token: string): string {
    return this.checksumService.generate(
      AdminPasswordResetService.CHECKSUM_CONTEXT,
      adminId,
      token,
    );
  }

  private buildResetLink(
    baseUrl: string | undefined,
    email: string,
    token: string,
  ): string {
    const fallback = 'https://admin.koajo.local/reset-password';
    const target = baseUrl?.trim() || fallback;

    try {
      const url = new URL(target);
      url.searchParams.set('token', token);
      url.searchParams.set('email', email);
      return url.toString();
    } catch {
      const separator = target.includes('?') ? '&' : '?';
      return `${target}${separator}token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    }
  }
}
