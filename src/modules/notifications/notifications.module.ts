import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MailService } from '../../common/notification/mail.service';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateService } from './notification-template.service';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountNotificationEntity } from '../accounts/entities/account-notification.entity';
import { InAppNotificationService } from './in-app-notification.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      NotificationTemplateEntity,
      AccountEntity,
      AccountNotificationEntity,
    ]),
  ],
  providers: [NotificationTemplateService, MailService, InAppNotificationService],
  exports: [NotificationTemplateService, MailService, InAppNotificationService],
})
export class NotificationsModule {}
