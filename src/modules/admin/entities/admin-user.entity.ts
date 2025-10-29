import {
  Collection,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminRole } from '../admin-role.enum';
import { AdminRoleEntity } from './admin-role.entity';
import { AdminPermissionEntity } from './admin-permission.entity';
import { AdminUserPermissionOverrideEntity } from './admin-user-permission-override.entity';

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

  @Property({ columnType: 'varchar(60)', nullable: true })
  firstName?: string | null;

  @Property({ columnType: 'varchar(60)', nullable: true })
  lastName?: string | null;

  @Property({ columnType: 'varchar(32)', nullable: true })
  phoneNumber?: string | null;

  @Property({ columnType: 'tinyint(1)', default: true })
  isActive = true;

  @Property({ columnType: 'tinyint(1)', default: false })
  requiresPasswordChange = false;

  @Property({ columnType: 'datetime(6)', nullable: true })
  invitedAt?: Date | null;

  @Property({ columnType: 'char(36)', nullable: true })
  invitedById?: string | null;

  @Property({ columnType: 'datetime(6)', nullable: true })
  passwordChangedAt?: Date | null;

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

  @ManyToMany(() => AdminRoleEntity, (role) => role.users, {
    owner: true,
    pivotTable: 'admin_user_roles',
    joinColumn: 'admin_user_id',
    inverseJoinColumn: 'admin_role_id',
  })
  roles = new Collection<AdminRoleEntity>(this);

  @ManyToMany(() => AdminPermissionEntity, (permission) => permission.users, {
    owner: true,
    pivotTable: 'admin_user_permissions',
    joinColumn: 'admin_user_id',
    inverseJoinColumn: 'admin_permission_id',
  })
  directPermissions = new Collection<AdminPermissionEntity>(this);

  @OneToMany(
    () => AdminUserPermissionOverrideEntity,
    (override) => override.user,
  )
  permissionOverrides = new Collection<AdminUserPermissionOverrideEntity>(this);
}
