import {
  Collection,
  Entity,
  ManyToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminRoleEntity } from './admin-role.entity';
import { AdminUserEntity } from './admin-user.entity';

@Entity({ tableName: 'admin_permissions' })
@Unique({ properties: ['code'] })
export class AdminPermissionEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(128)' })
  code!: string;

  @Property({ columnType: 'varchar(255)', nullable: true })
  name?: string | null;

  @Property({ columnType: 'text', nullable: true })
  description?: string | null;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();

  @ManyToMany(() => AdminRoleEntity, (role) => role.permissions)
  roles = new Collection<AdminRoleEntity>(this);

  @ManyToMany(() => AdminUserEntity, (user) => user.directPermissions)
  users = new Collection<AdminUserEntity>(this);
}
