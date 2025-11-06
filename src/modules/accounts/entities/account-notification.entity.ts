import {
  Entity,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AccountEntity } from './account.entity';

@Entity({ tableName: 'account_notifications' })
export class AccountNotificationEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AccountEntity, { nullable: false, deleteRule: 'cascade' })
  account!: AccountEntity;

  @Property({ columnType: 'varchar(255)' })
  title!: string;

  @Property({ columnType: 'text' })
  body!: string;

  @Property({ columnType: 'varchar(32)' })
  severity!: string;

  @Property({ columnType: 'varchar(512)', nullable: true })
  actionUrl?: string | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  readAt?: Date | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
