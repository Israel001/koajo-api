import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { CreateAdminAnnouncementCommand } from '../create-admin-announcement.command';
import { AdminAnnouncementEntity } from '../../entities/admin-announcement.entity';
import { AdminAnnouncementRecipientEntity } from '../../entities/admin-announcement-recipient.entity';
import { AdminAnnouncementResult } from '../../contracts/admin-results';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { MailService } from '../../../../common/notification/mail.service';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { AnnouncementChannel } from '../../announcement-channel.enum';
import { AnnouncementSeverity } from '../../announcement-severity.enum';

@Injectable()
@CommandHandler(CreateAdminAnnouncementCommand)
export class CreateAdminAnnouncementHandler
  implements ICommandHandler<CreateAdminAnnouncementCommand, AdminAnnouncementResult>
{
  private readonly logger = new Logger(CreateAdminAnnouncementHandler.name);

  constructor(
    @InjectRepository(AdminAnnouncementEntity)
    private readonly announcementRepository: EntityRepository<AdminAnnouncementEntity>,
    @InjectRepository(AdminAnnouncementRecipientEntity)
    private readonly announcementRecipientRepository: EntityRepository<AdminAnnouncementRecipientEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly mailService: MailService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(
    command: CreateAdminAnnouncementCommand,
  ): Promise<AdminAnnouncementResult> {
    let admin: AdminUserEntity | null = null;
    if (command.adminId) {
      admin = await this.adminRepository.findOne({ id: command.adminId });
      if (!admin) {
        throw new NotFoundException('Admin user not found.');
      }
    }

    const trimmedName = command.name.trim();
    if (!trimmedName.length) {
      throw new BadRequestException('Announcement name cannot be empty.');
    }

    const trimmedMessage = command.message.trim();
    if (!trimmedMessage.length) {
      throw new BadRequestException('Announcement message cannot be empty.');
    }

    let recipients: AccountEntity[];
    if (command.sendToAll) {
      recipients = await this.accountRepository.findAll();
      if (!recipients.length) {
        throw new BadRequestException('No accounts available to notify.');
      }
    } else {
      if (!command.accountIds || !command.accountIds.length) {
        throw new BadRequestException(
          'Recipient account ids must be supplied when sendToAll is false.',
        );
      }
      recipients = await this.accountRepository.find({
        id: { $in: command.accountIds },
      });
      if (recipients.length !== command.accountIds.length) {
        throw new BadRequestException(
          'One or more specified accounts could not be found.',
        );
      }
    }

    const uniqueRecipients = this.uniqueById(recipients);
    if (!uniqueRecipients.length) {
      throw new BadRequestException('No valid recipients resolved for the announcement.');
    }

    const em = this.announcementRepository.getEntityManager();
    const trimmedTitle = command.notificationTitle.trim();
    const normalizedActionUrl =
      command.actionUrl && command.actionUrl.trim().length
        ? command.actionUrl.trim()
        : null;
    const normalizedImageUrl =
      command.imageUrl && command.imageUrl.trim().length
        ? command.imageUrl.trim()
        : null;

    const announcement = this.announcementRepository.create(
      {
        name: trimmedName,
        channel: command.channel,
        severity: command.severity,
        notificationTitle: trimmedTitle,
        message: trimmedMessage,
        actionUrl: normalizedActionUrl,
        imageUrl: normalizedImageUrl,
        sendToAll: command.sendToAll,
        createdBy: admin ?? null,
      },
      { partial: true },
    );

    em.persist(announcement);

    if (!command.sendToAll) {
      for (const recipient of uniqueRecipients) {
        const link = this.announcementRecipientRepository.create(
          {
            announcement,
            account: recipient,
          },
          { partial: true },
        );
        em.persist(link);
      }
    }

    await em.flush();

    const tasks: Promise<void>[] = [];
    if (command.channel === AnnouncementChannel.EMAIL) {
      for (const recipient of uniqueRecipients) {
        tasks.push(
          this.mailService.sendAnnouncementEmail({
            announcementName: trimmedName,
            account: recipient,
            title: trimmedTitle,
            message: trimmedMessage,
            actionUrl: normalizedActionUrl ?? undefined,
            imageUrl: normalizedImageUrl ?? undefined,
          }),
        );
      }
    } else if (command.channel === AnnouncementChannel.IN_APP) {
      const notifications = uniqueRecipients.map((account) => ({
        account,
        title: trimmedTitle,
        body: this.composePlainMessage(account, trimmedMessage),
        severity: command.severity,
        actionUrl: normalizedActionUrl,
      }));

      tasks.push(
        this.inAppNotificationService.createMany(notifications),
      );
    }

    this.dispatchNotificationTasks(tasks);

    return {
      id: announcement.id,
      name: announcement.name,
      channel: announcement.channel,
      severity: announcement.severity,
      notificationTitle: announcement.notificationTitle,
      sendToAll: announcement.sendToAll,
      actionUrl: announcement.actionUrl ?? null,
      imageUrl: announcement.imageUrl ?? null,
      totalRecipients: uniqueRecipients.length,
      createdAt: announcement.createdAt.toISOString(),
    };
  }

  private uniqueById(accounts: AccountEntity[]): AccountEntity[] {
    const map = new Map<string, AccountEntity>();
    for (const account of accounts) {
      map.set(account.id, account);
    }
    return Array.from(map.values());
  }

  private composePlainMessage(account: AccountEntity, message: string): string {
    const greetingName =
      account.firstName?.trim() ||
      (account.email ? account.email.split('@')[0] : 'there');
    const body = message.trim();
    return `Hi ${greetingName},\n\n${body}`;
  }

  private dispatchNotificationTasks(tasks: Promise<void>[]): void {
    if (!tasks.length) {
      return;
    }

    void Promise.allSettled(tasks).then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const reason = result.reason;
          const message =
            reason instanceof Error ? reason.message : String(reason);
          this.logger.error(
            `Announcement notification task ${index + 1} failed: ${message}`,
            reason instanceof Error ? reason.stack : undefined,
          );
        }
      });
    });
  }
}
