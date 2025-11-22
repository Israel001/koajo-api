import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminActivityAction } from '../admin-activity-action.enum';

@Entity({ tableName: 'admin_activities' })
export class AdminActivityEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(64)' })
  adminId!: string;

  @Enum(() => AdminActivityAction)
  action!: AdminActivityAction;

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();
}
