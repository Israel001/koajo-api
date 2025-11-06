import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminAnnouncementEntity } from './admin-announcement.entity';
import { AccountEntity } from '../../accounts/entities/account.entity';

@Entity({ tableName: 'admin_announcement_recipients' })
export class AdminAnnouncementRecipientEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AdminAnnouncementEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  announcement!: AdminAnnouncementEntity;

  @ManyToOne(() => AccountEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  account!: AccountEntity;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();
}
