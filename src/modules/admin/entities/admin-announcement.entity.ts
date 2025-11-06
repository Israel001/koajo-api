import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminUserEntity } from './admin-user.entity';
import { AdminAnnouncementRecipientEntity } from './admin-announcement-recipient.entity';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

@Entity({ tableName: 'admin_announcements' })
export class AdminAnnouncementEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(160)' })
  name!: string;

  @Enum(() => AnnouncementChannel)
  channel: AnnouncementChannel = AnnouncementChannel.EMAIL;

  @Enum(() => AnnouncementSeverity)
  severity: AnnouncementSeverity = AnnouncementSeverity.INFO;

  @Property({ columnType: 'varchar(180)' })
  notificationTitle!: string;

  @Property({ columnType: 'text' })
  message!: string;

  @Property({ columnType: 'varchar(512)', nullable: true })
  actionUrl?: string | null;

  @Property({ columnType: 'varchar(512)', nullable: true })
  imageUrl?: string | null;

  @Property({ columnType: 'tinyint(1)', default: false })
  sendToAll = false;

  @ManyToOne(() => AdminUserEntity, {
    nullable: true,
    deleteRule: 'set null',
  })
  createdBy?: AdminUserEntity | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @OneToMany(
    () => AdminAnnouncementRecipientEntity,
    (recipient) => recipient.announcement,
    { orphanRemoval: true },
  )
  recipients = new Collection<AdminAnnouncementRecipientEntity>(this);
}
