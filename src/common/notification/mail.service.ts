import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { NotificationTemplateService } from '../../modules/notifications/notification-template.service';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../modules/accounts/entities/account.entity';

interface SendOptions {
  from?: string;
  reason?: string;
  variables?: Record<string, string | number>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationTemplateService: NotificationTemplateService,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {
    const mailConfig = this.configService.get('mail', { infer: true })!;

    const requiresAuth = Boolean(mailConfig.user && mailConfig.pass);

    this.transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: requiresAuth
        ? {
            user: mailConfig.user,
            pass: mailConfig.pass,
          }
        : undefined,
      logger: true,
      debug: true,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    this.defaultFrom = mailConfig.defaultFrom;
  }

  async sendEmailVerification(
    email: string,
    verificationLink: string,
    expiresAt: Date,
    options: SendOptions = {},
  ): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const from = options.from ?? this.defaultFrom;
    const subject = 'Account Verification';
    const expiresLabel = expiresAt.toLocaleString('en-US', {
      hour12: false,
    });

    const replacements = {
      link: verificationLink,
      expiresLabel,
      ...(options.variables ?? {}),
    };

    const htmlBody = await this.notificationTemplateService.render(
      'verify_account',
      replacements,
    );

    const textBody =
      typeof options.variables?.textBody === 'string'
        ? options.variables.textBody
        : undefined;

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Verification email queued for ${email} (id=${info.messageId})${
          options.reason ? ` [reason=${options.reason}]` : ''
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendPasswordReset(
    email: string,
    resetLink: string,
    expiresAt: Date,
    options: SendOptions = {},
  ): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const from = options.from ?? this.defaultFrom;
    const subject = 'Reset your Koajo password';
    const expiresLabel = expiresAt.toLocaleString('en-US', {
      hour12: false,
    });

    const replacements = {
      link: resetLink,
      expiresLabel,
      ...(options.variables ?? {}),
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'reset_password',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default reset template: ${(error as Error).message}`,
      );
      const fallbackName =
        typeof options.variables?.firstname === 'string'
          ? options.variables.firstname
          : 'there';
      htmlBody = `
        <p>Hello ${fallbackName},</p>
        <p>Use the link below to reset your Koajo password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires at <strong>${expiresLabel}</strong>.</p>
      `;
    }

    const textBody =
      typeof options.variables?.textBody === 'string'
        ? options.variables.textBody
        : undefined;

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Password reset email queued for ${email} (id=${info.messageId})${
          options.reason ? ` [reason=${options.reason}]` : ''
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, firstname: string): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const subject = "You're in! Let's fund what matters";
    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render('welcome', {
        firstname,
      });
    } catch (error) {
      this.logger.warn(
        `Falling back to default welcome template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hi ${firstname},</p>
        <p>Welcome to Koajo! Your account has been verified successfully.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Welcome email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendPasswordChangedEmail(email: string, firstname: string): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const subject = 'Your Koajo password was changed';
    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'change_password',
        {
          firstname,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default password change template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hi ${firstname},</p>
        <p>This is a confirmation that your Koajo password was changed. If this wasn't you, please contact support immediately.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Password change email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send password change email to ${email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendAdminInvite(
    email: string,
    options: {
      password: string;
      templateCode?: string;
      from?: string;
      variables?: Record<string, string | number>;
    },
  ): Promise<void> {
    const from = options.from ?? this.defaultFrom;
    const template = options.templateCode ?? 'admin_invite';
    const replacements = {
      password: options.password,
      ...(options.variables ?? {}),
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        template,
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default admin invite template: ${(error as Error).message}`,
      );
      const firstname =
        typeof options.variables?.firstname === 'string'
          ? options.variables.firstname
          : 'there';
      htmlBody = `
        <p>Hello ${firstname},</p>
        <p>You have been invited to the Koajo admin platform.</p>
        <p>Your temporary password is: <strong>${options.password}</strong></p>
        <p>Please sign in and change your password immediately.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from,
        subject: 'Koajo admin invitation',
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Admin invite email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send admin invite email to ${email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendCustomPodInvitation(options: {
    email: string;
    inviterName: string;
    podId: string;
    token: string;
    cadence: string;
    amount: number;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const from = this.defaultFrom;
    const subject = `${options.inviterName} invited you to join a custom pod`;

    const rawBaseUrl = this.configService.get<string>('app.customPodInviteUrl', {
      infer: true,
    });

    const fallbackBase = 'https://app.koajo.local/custom-pods/accept';
    const baseUrl = rawBaseUrl && rawBaseUrl.trim().length ? rawBaseUrl.trim() : fallbackBase;

    let inviteLink = `${baseUrl}?token=${encodeURIComponent(options.token)}&podId=${encodeURIComponent(options.podId)}`;
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('token', options.token);
      url.searchParams.set('podId', options.podId);
      inviteLink = url.toString();
    } catch {
      // ignore, fallback already assigned
    }

    const replacements = {
      inviter: options.inviterName,
      cadence: options.cadence,
      amount: options.amount,
      inviteLink,
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'custom_pod_invite',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default custom pod invite template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hello,</p>
        <p>${options.inviterName} invited you to join a Koajo custom pod.</p>
        <p>Cadence: <strong>${options.cadence}</strong></p>
        <p>Contribution amount: <strong>${options.amount}</strong></p>
        <p>Use the link below to accept:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: options.email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Custom pod invitation email queued for ${options.email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send custom pod invite to ${options.email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendAccountInactivityReminder(email: string): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const subject = 'We miss you at Koajo';
    const templateCode = '60_days_inactive';

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(templateCode, {});
    } catch (error) {
      this.logger.warn(
        `Falling back to default 60-day inactivity template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hello,</p>
        <p>It’s been a while since you joined a pod. Come back and pick up where you left off.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `60-day inactivity email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send 60-day inactivity email to ${email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendAccountClosureNotice(email: string, currentDate: Date): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const subject = 'Your Koajo account has been closed';
    const templateCode = 'account_closure';
    const variables = {
      currentDate: currentDate.toISOString(),
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(templateCode, variables);
    } catch (error) {
      this.logger.warn(
        `Falling back to default account closure template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hello,</p>
        <p>Your Koajo account was closed on ${variables.currentDate} due to inactivity.</p>
        <p>If this was unexpected, please reach out to support.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.transporter.sendMail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
      });

      this.logger.log(
        `Account closure email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send account closure email to ${email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private async shouldSendEmail(
    email: string,
    category: 'system' | 'transaction',
  ): Promise<boolean> {
    const normalized = email.trim().toLowerCase();

    let account: AccountEntity | null = null;
    try {
      account = await this.accountRepository.findOne({ email: normalized });
    } catch (error) {
      this.logger.warn(
        `Failed to load notification preferences for ${normalized}: ${(error as Error).message}`,
      );
      return true;
    }

    if (!account) {
      return true;
    }

    if (category === 'transaction') {
      if (!account.transactionNotificationsEnabled) {
        this.logger.debug(
          `Skipping transaction email to ${normalized}: transaction notifications disabled`,
        );
        return false;
      }
      return true;
    }

    if (!account.emailNotificationsEnabled) {
      this.logger.debug(
        `Skipping system email to ${normalized}: email notifications disabled`,
      );
      return false;
    }

    return true;
  }
}
