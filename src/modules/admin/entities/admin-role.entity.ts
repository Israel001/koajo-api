import {
  Collection,
  Entity,
  ManyToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminPermissionEntity } from './admin-permission.entity';
import { AdminUserEntity } from './admin-user.entity';

@Entity({ tableName: 'admin_roles' })
@Unique({ properties: ['name'] })
export class AdminRoleEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(64)' })
  name!: string;

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

  @ManyToMany(() => AdminPermissionEntity, (permission) => permission.roles, {
    owner: true,
    pivotTable: 'admin_role_permissions',
    joinColumn: 'admin_role_id',
    inverseJoinColumn: 'admin_permission_id',
  })
  permissions = new Collection<AdminPermissionEntity>(this);

  @ManyToMany(() => AdminUserEntity, (user) => user.roles)
  users = new Collection<AdminUserEntity>(this);
}
