import {
  Entity,
  Enum,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export enum EmailLogStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum EmailLogCategory {
  SYSTEM = 'system',
  TRANSACTION = 'transaction',
}

@Entity({ tableName: 'email_logs' })
export class EmailLogEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(320)' })
  to!: string;

  @Property({ columnType: 'varchar(320)', nullable: true })
  from?: string | null;

  @Property({ columnType: 'varchar(255)' })
  subject!: string;

  @Property({ columnType: 'varchar(64)', nullable: true })
  template?: string | null;

  @Enum(() => EmailLogCategory)
  category: EmailLogCategory = EmailLogCategory.SYSTEM;

  @Property({ columnType: 'varchar(255)', nullable: true })
  reason?: string | null;

  @Enum(() => EmailLogStatus)
  status: EmailLogStatus = EmailLogStatus.PENDING;

  @Property({ columnType: 'varchar(255)', nullable: true })
  messageId?: string | null;

  @Property({ columnType: 'text', nullable: true })
  errorMessage?: string | null;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @Property({ columnType: 'datetime(6)', nullable: true })
  sentAt?: Date | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  failedAt?: Date | null;
}
