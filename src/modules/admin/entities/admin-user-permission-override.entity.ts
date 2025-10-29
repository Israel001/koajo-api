import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
  Unique,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AdminUserEntity } from './admin-user.entity';
import { AdminPermissionEntity } from './admin-permission.entity';

export enum AdminPermissionOverrideType {
  ALLOW = 'allow',
  DENY = 'deny',
}

@Entity({ tableName: 'admin_user_permission_overrides' })
@Unique({ properties: ['user', 'permission'] })
export class AdminUserPermissionOverrideEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @ManyToOne(() => AdminUserEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  user!: AdminUserEntity;

  @ManyToOne(() => AdminPermissionEntity, {
    nullable: false,
    deleteRule: 'cascade',
  })
  permission!: AdminPermissionEntity;

  @Enum({
    items: () => AdminPermissionOverrideType,
    nativeEnumName: 'admin_permission_override_type',
    columnType: 'varchar(16)',
  })
  type: AdminPermissionOverrideType = AdminPermissionOverrideType.ALLOW;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();
}
