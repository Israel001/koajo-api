import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';
import { promises as fs } from 'fs';
import { basename } from 'path';
import { NotificationTemplateService } from '../../modules/notifications/notification-template.service';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../modules/accounts/entities/account.entity';
import {
  EmailLogCategory,
  EmailLogEntity,
  EmailLogStatus,
} from '../../modules/notifications/entities/email-log.entity';

const ADMIN_PORTAL_URL_DEFAULT = 'https://koajo-admin.vercel.app';

interface SendOptions {
  from?: string;
  reason?: string;
  variables?: Record<string, string | number>;
}

interface TrackedEmailSendOptions {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    type?: string;
    disposition?: string;
    contentId?: string;
  }>;
  template?: string | null;
  category: EmailLogCategory;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly defaultFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationTemplateService: NotificationTemplateService,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(EmailLogEntity)
    private readonly emailLogRepository: EntityRepository<EmailLogEntity>,
  ) {
    const mailConfig = this.configService.get('mail', { infer: true })!;

    if (!mailConfig.sendgridApiKey) {
      this.logger.warn(
        'SENDGRID_API_KEY is not set; email delivery will fail until configured.',
      );
    } else {
      sgMail.setApiKey(mailConfig.sendgridApiKey);
    }

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
      const info = await this.sendAndTrackEmail({
        to: email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'verify_account',
        category: EmailLogCategory.SYSTEM,
        reason: options.reason ?? null,
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
      const info = await this.sendAndTrackEmail({
        to: email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'reset_password',
        category: EmailLogCategory.SYSTEM,
        reason: options.reason ?? null,
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
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'welcome',
        category: EmailLogCategory.SYSTEM,
      });
      this.logger.log(
        `Welcome email queued for ${email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendPasswordChangedEmail(
    email: string,
    firstname: string,
  ): Promise<void> {
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
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'change_password',
        category: EmailLogCategory.SYSTEM,
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

  async sendBankAccountRemovalEmail(options: {
    email: string;
    firstName?: string | null;
    removedAt: Date;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const subject = 'You removed your linked bank account';
    const firstname =
      options.firstName?.trim() ||
      (options.email ? options.email.split('@')[0] : 'there');
    let dateTimeLabel: string;
    try {
      dateTimeLabel = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(options.removedAt);
    } catch {
      dateTimeLabel = options.removedAt.toISOString();
    }

    const replacements = {
      firstName: firstname,
      dateTime: dateTimeLabel,
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'remove_bank_account',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default remove bank account template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hello ${firstname},</p>
        <p>We removed your linked bank account on ${dateTimeLabel}.</p>
        <p>If this wasn't you, please contact support immediately at <a href="mailto:support@koajo.com">support@koajo.com</a>.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: options.email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'remove_bank_account',
        category: EmailLogCategory.SYSTEM,
      });
      this.logger.log(
        `Remove bank account email queued for ${options.email} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send remove bank account email to ${options.email}: ${
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
      portalUrl?: string;
      username?: string;
      name?: string;
      variables?: Record<string, string | number>;
    },
  ): Promise<void> {
    const from = options.from ?? this.defaultFrom;
    const template = options.templateCode ?? 'admin_invite';
    const portalUrl =
      options.portalUrl?.trim().length && options.portalUrl.trim()
        ? options.portalUrl.trim()
        : ADMIN_PORTAL_URL_DEFAULT;
    const username =
      options.username?.trim().length && options.username.trim()
        ? options.username.trim()
        : email;

    const templateVariables: Record<string, string | number> = {
      ...(options.variables ?? {}),
    };

    const derivedName = options.name?.trim().length
      ? options.name.trim()
      : (typeof templateVariables.name === 'string' &&
        templateVariables.name.trim().length
          ? (templateVariables.name as string).trim()
          : `${templateVariables.firstname !== undefined ? String(templateVariables.firstname) : ''} ${
              templateVariables.lastname !== undefined
                ? String(templateVariables.lastname)
                : ''
            }`.trim()) || email.split('@')[0];

    if (
      typeof templateVariables.name !== 'string' ||
      !templateVariables.name.trim().length
    ) {
      templateVariables.name = derivedName;
    }

    if (
      typeof templateVariables.portalUrl !== 'string' ||
      !templateVariables.portalUrl.trim().length
    ) {
      templateVariables.portalUrl = portalUrl;
    }

    if (
      typeof templateVariables.username !== 'string' ||
      !templateVariables.username.trim().length
    ) {
      templateVariables.username = username;
    }

    const replacements = {
      password: options.password,
      ...templateVariables,
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
      htmlBody = `
        <p>Hello ${derivedName},</p>
        <p>You have been invited to the Koajo admin platform.</p>
        <p>Admin Portal: <a href="${portalUrl}">${portalUrl}</a></p>
        <p>Username: <strong>${username}</strong></p>
        <p>Your temporary password is: <strong>${options.password}</strong></p>
        <p>Please sign in and change your password immediately.</p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: email,
        from,
        subject: 'Welcome to the Team! Your Admin Portal Acess',
        html: htmlBody,
        text: textBody,
        template,
        category: EmailLogCategory.SYSTEM,
        reason: 'admin_invite',
        metadata: {
          portalUrl,
          username,
        },
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

  async sendAnnouncementEmail(options: {
    announcementName: string;
    account: AccountEntity;
    title: string;
    message: string;
    actionUrl?: string;
    imageUrl?: string;
  }): Promise<void> {
    const { account } = options;
    if (!(await this.shouldSendEmail(account.email, 'system'))) {
      return;
    }

    const firstname =
      account.firstName?.trim() ||
      (account.email ? account.email.split('@')[0] : 'there');
    const greeting = `Hi ${firstname},`;
    const message = options.message.trim();

    const htmlBody = this.composeAnnouncementHtml({
      greeting,
      message,
      actionUrl: options.actionUrl,
      imageUrl: options.imageUrl,
    });

    const textBody = this.composeAnnouncementText({
      greeting,
      message,
      actionUrl: options.actionUrl,
      imageUrl: options.imageUrl,
    });

    const subject = options.title || options.announcementName;

    const attachments =
      options.imageUrl && options.imageUrl.trim().length
        ? [
            {
              filename: this.deriveFilename(options.imageUrl),
              path: options.imageUrl,
            },
          ]
        : undefined;

    try {
      const info = await this.sendAndTrackEmail({
        to: account.email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        attachments,
        category: EmailLogCategory.SYSTEM,
        reason: options.announcementName,
        metadata: {
          announcementName: options.announcementName,
        },
      });
      this.logger.log(
        `Announcement email queued for ${account.email} (id=${info.messageId}) [announcement=${options.announcementName}]`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send announcement email to ${account.email}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }

  async sendRequestForInformationEmail(options: {
    email: string;
    firstName: string;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const subject = 'Help us verify your account activity';
    const replacements = {
      firstName: options.firstName,
      firstname: options.firstName,
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'request_for_information',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default request-for-information template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hi ${options.firstName},</p>
        <p>Please confirm your recent account activity so we can keep your Koajo account secure.</p>
      `;
    }

    await this.queueSystemEmail({
      to: options.email,
      subject,
      html: htmlBody,
    });
  }

  async sendTooManyPodsWarningEmail(options: {
    email: string;
    firstName: string;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const subject = "Let's make sure your pods work for you";
    const replacements = {
      firstName: options.firstName,
      firstname: options.firstName,
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'too_many_pods',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default too-many-pods template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hi ${options.firstName},</p>
        <p>We noticed you recently joined several pods. Please hold tight while we review your account.</p>
      `;
    }

    await this.queueSystemEmail({
      to: options.email,
      subject,
      html: htmlBody,
    });
  }

  async sendMissedContributionEmail(options: {
    email: string;
    amount: string | number;
    firstName?: string | null;
    reason?: string;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const subject = "We couldn't process your contribution";
    const formattedAmount =
      typeof options.amount === 'number'
        ? options.amount.toFixed(2)
        : Number.isFinite(Number.parseFloat(String(options.amount)))
          ? Number.parseFloat(String(options.amount)).toFixed(2)
          : String(options.amount);

    const replacements = {
      amount: formattedAmount,
      firstName:
        options.firstName?.trim() ||
        (options.email ? options.email.split('@')[0] : 'there'),
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        'missed_contribution',
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default missed contribution template: ${(error as Error).message}`,
      );
      htmlBody = `
        <p>Hi ${replacements.firstName},</p>
        <p>We couldn't process your contribution of $${formattedAmount}. Please retry in your dashboard.</p>
        <p>If you need help, reach us at support@koajo.com.</p>
      `;
    }

    await this.queueSystemEmail({
      to: options.email,
      subject,
      html: htmlBody,
    });
  }

  private async queueSystemEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    let textBody = options.text;
    if (!textBody) {
      try {
        textBody = options.html
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        textBody = undefined;
      }
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: options.to,
        from: this.defaultFrom,
        subject: options.subject,
        html: options.html,
        text: textBody,
        category: EmailLogCategory.SYSTEM,
      });
      this.logger.log(
        `System email (${options.subject}) queued for ${options.to} (id=${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ${options.subject} email to ${options.to}: ${
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
    podAmount: string;
    podMembers: string;
    podCycle: string;
    podName?: string;
    originBase?: string | null;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const from = this.defaultFrom;
    const subject = 'You were invited to a Koajo custom pod';

    const rawBaseUrl = this.configService.get<string>(
      'app.customPodInviteUrl',
      {
        infer: true,
      },
    );

    const fallbackBase = 'https://app.koajo.local/custom-pods/accept';
    const preferredOrigin =
      options.originBase && options.originBase.trim().length
        ? options.originBase.trim()
        : null;
    const baseUrl =
      preferredOrigin ??
      (rawBaseUrl && rawBaseUrl.trim().length
        ? rawBaseUrl.trim()
        : fallbackBase);

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
      podName: options.podName ?? 'Custom pod',
      podAmount: options.podAmount,
      podMembers: options.podMembers,
      podCycle: options.podCycle,
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
        <p>${options.inviterName} invited you to join the ${options.podName ?? 'Koajo custom pod'}.</p>
        <p>Cadence: <strong>${options.cadence}</strong></p>
        <p>Contribution amount: <strong>${options.amount}</strong></p>
        <p>Use the link below to accept:</p>
        <p><a href="${inviteLink}">${inviteLink}</a></p>
      `;
    }

    let textBody: string | undefined;
    try {
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: options.email,
        from,
        subject,
        html: htmlBody,
        text: textBody,
        template: 'custom_pod_invite',
        category: EmailLogCategory.SYSTEM,
        metadata: {
          podId: options.podId,
        },
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

  async sendPodJoinConfirmationEmail(options: {
    email: string;
    firstName: string;
    podAmount: string;
    podMembers: string;
    podCycle: string;
    isCustom: boolean;
  }): Promise<void> {
    if (!(await this.shouldSendEmail(options.email, 'system'))) {
      return;
    }

    const template = options.isCustom
      ? 'custom_pod_confirmation'
      : 'pod_confirmation';

    const replacements = {
      podAmount: options.podAmount,
      podMembers: options.podMembers,
      podCycle: options.podCycle,
    };

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        template,
        replacements,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to default pod confirmation template (${template}): ${
          (error as Error).message
        }`,
      );
      htmlBody = `
        <p>Hi ${options.firstName},</p>
        <p>Your pod details:</p>
        <ul>
          <li>Amount: ${options.podAmount}</li>
          <li>Members: ${options.podMembers}</li>
          <li>Cycle: ${options.podCycle}</li>
        </ul>
      `;
    }

    await this.queueSystemEmail({
      to: options.email,
      subject: 'You just joined a Koajo pod',
      html: htmlBody,
    });
  }

  async sendAccountInactivityReminder(email: string): Promise<void> {
    if (!(await this.shouldSendEmail(email, 'system'))) {
      return;
    }

    const subject = 'We miss you at Koajo';
    const templateCode = '60_days_inactive';

    let htmlBody: string;
    try {
      htmlBody = await this.notificationTemplateService.render(
        templateCode,
        {},
      );
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
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        template: templateCode,
        category: EmailLogCategory.SYSTEM,
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

  async sendAccountClosureNotice(
    email: string,
    currentDate: Date,
  ): Promise<void> {
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
      htmlBody = await this.notificationTemplateService.render(
        templateCode,
        variables,
      );
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
      textBody = htmlBody
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      textBody = undefined;
    }

    try {
      const info = await this.sendAndTrackEmail({
        to: email,
        from: this.defaultFrom,
        subject,
        html: htmlBody,
        text: textBody,
        template: templateCode,
        category: EmailLogCategory.SYSTEM,
        metadata: {
          currentDate: variables.currentDate,
        },
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

  private async sendAndTrackEmail(options: TrackedEmailSendOptions) {
    const log = await this.createEmailLog({
      to: options.to,
      from: options.from ?? this.defaultFrom,
      subject: options.subject,
      template: options.template ?? null,
      category: options.category,
      reason: options.reason ?? null,
      metadata: options.metadata ?? null,
    });

    try {
      const payload: MailDataRequired = {
        to: options.to,
        from: options.from ?? this.defaultFrom,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
          ? await this.normalizeAttachments(options.attachments)
          : undefined,
      };

      const [response] = await sgMail.send(payload);
      const messageId =
        (response.headers['x-message-id'] as string | undefined) ??
        (response.headers['x-message-id'] as string | undefined) ??
        null;
      await this.markEmailLogSent(log, messageId);
      return { messageId };
    } catch (error) {
      await this.markEmailLogFailed(log, error as Error);
      throw error;
    }
  }

  private async normalizeAttachments(
    attachments: NonNullable<TrackedEmailSendOptions['attachments']>,
  ): Promise<MailDataRequired['attachments']> {
    const normalized: MailDataRequired['attachments'] = [];

    for (const attachment of attachments) {
      if (attachment.content) {
        normalized.push({
          content: this.toBase64(attachment.content),
          filename: attachment.filename,
          type: attachment.type,
          disposition: attachment.disposition,
          contentId: attachment.contentId,
        });
        continue;
      }

      if (!attachment.path) {
        this.logger.warn(
          `Skipping attachment ${attachment.filename}: no content or path provided.`,
        );
        continue;
      }

      if (attachment.path.startsWith('http')) {
        this.logger.warn(
          `Skipping remote attachment ${attachment.path}: SendGrid requires inline content.`,
        );
        continue;
      }

      try {
        const file = await fs.readFile(attachment.path);
        normalized.push({
          content: file.toString('base64'),
          filename: attachment.filename || basename(attachment.path),
          type: attachment.type,
          disposition: attachment.disposition,
          contentId: attachment.contentId,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to load attachment ${attachment.path}: ${(error as Error).message}`,
        );
      }
    }

    return normalized.length ? normalized : undefined;
  }

  private toBase64(content: Buffer | string): string {
    if (Buffer.isBuffer(content)) {
      return content.toString('base64');
    }
    return Buffer.from(content, 'utf8').toString('base64');
  }

  private async createEmailLog(details: {
    to: string;
    from: string;
    subject: string;
    template: string | null;
    category: EmailLogCategory;
    reason: string | null;
    metadata: Record<string, unknown> | null;
  }): Promise<EmailLogEntity | null> {
    try {
      const log = this.emailLogRepository.create(
        {
          to: details.to,
          from: details.from,
          subject: details.subject,
          template: details.template,
          category: details.category,
          reason: details.reason,
          metadata: details.metadata,
        },
        { partial: true },
      );
      await this.emailLogRepository.getEntityManager().persistAndFlush(log);
      return log;
    } catch (error) {
      this.logger.warn(
        `Failed to record email log for ${details.to}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async markEmailLogSent(
    log: EmailLogEntity | null,
    messageId?: string | null,
  ): Promise<void> {
    if (!log) {
      return;
    }
    log.status = EmailLogStatus.SENT;
    log.messageId = messageId ?? null;
    log.sentAt = new Date();

    try {
      await this.emailLogRepository.getEntityManager().flush();
    } catch (error) {
      this.logger.warn(
        `Failed to update email log ${log.id} as sent: ${(error as Error).message}`,
      );
    }
  }

  private async markEmailLogFailed(
    log: EmailLogEntity | null,
    error: Error,
  ): Promise<void> {
    if (!log) {
      return;
    }
    log.status = EmailLogStatus.FAILED;
    log.errorMessage = error.message;
    log.failedAt = new Date();

    try {
      await this.emailLogRepository.getEntityManager().flush();
    } catch (flushError) {
      this.logger.warn(
        `Failed to update email log ${log.id} as failed: ${(flushError as Error).message}`,
      );
    }
  }

  async sendManualTemplateEmail(options: {
    templateCode: string;
    subject: string;
    recipients: Array<{
      email: string;
      variables?: Record<string, string | number | string[]>;
    }>;
    reason?: string;
  }): Promise<number> {
    let sent = 0;

    for (const recipient of options.recipients) {
      if (!(await this.shouldSendEmail(recipient.email, 'system'))) {
        continue;
      }

      let htmlBody: string;
      try {
        htmlBody = await this.notificationTemplateService.render(
          options.templateCode,
          (recipient.variables ?? {}) as Record<string, string | number>,
        );
      } catch (error) {
        this.logger.error(
          `Failed to render template ${options.templateCode} for ${recipient.email}: ${
            (error as Error).message
          }`,
        );
        throw error;
      }

      let textBody: string | undefined;
      try {
        textBody = htmlBody
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch {
        textBody = undefined;
      }

      await this.sendAndTrackEmail({
        to: recipient.email,
        subject: options.subject,
        html: htmlBody,
        text: textBody,
        template: options.templateCode,
        category: EmailLogCategory.SYSTEM,
        reason: options.reason ?? options.templateCode,
        metadata: recipient.variables ?? null,
      });
      sent += 1;
    }

    return sent;
  }

  private composeAnnouncementHtml(params: {
    greeting: string;
    message: string;
    actionUrl?: string;
    imageUrl?: string;
  }): string {
    const parts: string[] = [];
    parts.push(`<p>${this.escapeHtml(params.greeting)}</p>`);

    const messageParagraphs = params.message
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!messageParagraphs.length) {
      messageParagraphs.push(params.message.trim());
    }

    for (const paragraph of messageParagraphs) {
      parts.push(`<p>${this.escapeHtml(paragraph)}</p>`);
    }

    if (params.actionUrl) {
      const safeUrl = this.escapeAttribute(params.actionUrl);
      parts.push(
        `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">View details</a></p>`,
      );
    }

    if (params.imageUrl) {
      const safeImageUrl = this.escapeAttribute(params.imageUrl);
      parts.push(
        `<p><a href="${safeImageUrl}" target="_blank" rel="noopener noreferrer">View announcement image</a></p>`,
      );
    }

    return parts.join('\n');
  }

  private composeAnnouncementText(params: {
    greeting: string;
    message: string;
    actionUrl?: string;
    imageUrl?: string;
  }): string {
    const lines: string[] = [params.greeting, ''];
    const paragraphs = params.message
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (paragraphs.length) {
      lines.push(...paragraphs);
    } else {
      lines.push(params.message.trim());
    }
    if (params.actionUrl) {
      lines.push('', `Action: ${params.actionUrl}`);
    }
    if (params.imageUrl) {
      lines.push('', `Image: ${params.imageUrl}`);
    }
    return lines.join('\n');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value);
  }

  private deriveFilename(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.split('/').filter(Boolean).pop();
      if (pathname) {
        return pathname;
      }
    } catch {
      // ignore
    }
    return 'attachment';
  }
}
