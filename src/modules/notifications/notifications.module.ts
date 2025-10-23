import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MailService } from '../../common/notification/mail.service';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateService } from './notification-template.service';
import { AccountEntity } from '../accounts/entities/account.entity';

@Module({
  imports: [MikroOrmModule.forFeature([NotificationTemplateEntity, AccountEntity])],
  providers: [NotificationTemplateService, MailService],
  exports: [NotificationTemplateService, MailService],
})
export class NotificationsModule {}
