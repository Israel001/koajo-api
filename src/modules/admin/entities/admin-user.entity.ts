import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminRole } from '../admin-role.enum';

@Entity({ tableName: 'admin_users' })
@Unique({ properties: ['email'] })
export class AdminUserEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(320)' })
  email!: string;

  @Property({ columnType: 'varchar(255)' })
  passwordHash!: string;

  @Property({ columnType: 'varchar(32)' })
  role: AdminRole = AdminRole.ADMIN;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @Property({ columnType: 'datetime(6)', nullable: true })
  lastLoginAt?: Date | null;
}
