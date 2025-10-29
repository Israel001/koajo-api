import { Injectable } from '@nestjs/common';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { AdminPermissionOverrideType } from '../entities/admin-user-permission-override.entity';
import type {
  AdminPermissionSummary,
  AdminRoleSummary,
  AdminUserDto,
} from '../contracts/admin-results';
import { AdminPermissionEntity } from '../entities/admin-permission.entity';
import { AdminRoleEntity } from '../entities/admin-role.entity';

@Injectable()
export class AdminAccessService {
  computeEffectivePermissions(
    user: AdminUserEntity,
  ): {
    effective: string[];
    explicit: AdminPermissionEntity[];
    denied: AdminPermissionEntity[];
  } {
    const permissionSet = new Set<string>();

    for (const role of user.roles.getItems()) {
      for (const permission of role.permissions.getItems()) {
        permissionSet.add(permission.code);
      }
    }

    const explicit = user.directPermissions.getItems();
    for (const permission of explicit) {
      permissionSet.add(permission.code);
    }

    const denied: AdminPermissionEntity[] = [];

    for (const override of user.permissionOverrides.getItems()) {
      const permission = override.permission;
      if (!permission) {
        // Should not happen when populated, but skip defensively.
        continue;
      }

      if (override.type === AdminPermissionOverrideType.DENY) {
        permissionSet.delete(permission.code);
        denied.push(permission);
      } else {
        permissionSet.add(permission.code);
      }
    }

    return {
      effective: Array.from(permissionSet).sort(),
      explicit,
      denied,
    };
  }

  mapAdminUser(user: AdminUserEntity): AdminUserDto {
    const { effective, explicit, denied } = this.computeEffectivePermissions(user);

    const mapPermission = (
      permission: AdminPermissionEntity,
    ): AdminPermissionSummary => ({
      id: permission.id,
      code: permission.code,
      name: permission.name ?? null,
      description: permission.description ?? null,
    });

    const roles: AdminRoleSummary[] = user.roles
      .getItems()
      .map((role) => this.mapRole(role));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phoneNumber: user.phoneNumber ?? null,
      isActive: user.isActive,
      requiresPasswordChange: user.requiresPasswordChange,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      invitedAt: user.invitedAt ? user.invitedAt.toISOString() : null,
      invitedById: user.invitedById ?? null,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      roles,
      explicitPermissions: explicit.map(mapPermission),
      deniedPermissions: denied.map(mapPermission),
      effectivePermissions: effective,
    };
  }

  mapRole(role: AdminRoleEntity): AdminRoleSummary {
    const mapPermission = (
      permission: AdminPermissionEntity,
    ): AdminPermissionSummary => ({
      id: permission.id,
      code: permission.code,
      name: permission.name ?? null,
      description: permission.description ?? null,
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      permissions: role.permissions
        .getItems()
        .map((permission) => mapPermission(permission)),
    };
  }
}
