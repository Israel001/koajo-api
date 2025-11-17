import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { SetAdminUserPermissionsCommand } from '../set-admin-user-permissions.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import {
  AdminPermissionOverrideType,
  AdminUserPermissionOverrideEntity,
} from '../../entities/admin-user-permission-override.entity';
import type { AdminUserDto } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(SetAdminUserPermissionsCommand)
export class SetAdminUserPermissionsHandler
  implements ICommandHandler<SetAdminUserPermissionsCommand, AdminUserDto>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
    @InjectRepository(AdminUserPermissionOverrideEntity)
    private readonly overrideRepository: EntityRepository<AdminUserPermissionOverrideEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: SetAdminUserPermissionsCommand,
  ): Promise<AdminUserDto> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can adjust admin permissions.',
      );
    }

    if (command.requester.adminId === command.adminId) {
      throw new ForbiddenException(
        'Admins cannot modify their own permissions.',
      );
    }

    const admin = await this.adminRepository.findOne(command.adminId, {
      populate: [
        'roles.permissions',
        'directPermissions',
        'permissionOverrides.permission',
      ],
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    const allowSource = command.payload.allow ?? [];
    const denySource = command.payload.deny ?? [];

    const allowIds = new Set(
      allowSource.map((id) => id.trim()).filter(Boolean),
    );
    const denyIds = new Set(denySource.map((id) => id.trim()).filter(Boolean));

    for (const id of allowIds) {
      if (denyIds.has(id)) {
        throw new BadRequestException(
          `Permission "${id}" cannot be both allowed and denied.`,
        );
      }
    }

    const allowPermissions = allowIds.size
      ? await this.permissionRepository.find({ id: { $in: [...allowIds] } })
      : [];

    if (allowPermissions.length !== allowIds.size) {
      const found = new Set(allowPermissions.map((perm) => perm.id));
      const missing = [...allowIds].filter((id) => !found.has(id));
      throw new NotFoundException(
        `The following permissions could not be found: ${missing.join(', ')}`,
      );
    }

    const denyPermissions = denyIds.size
      ? await this.permissionRepository.find({ id: { $in: [...denyIds] } })
      : [];

    if (denyPermissions.length !== denyIds.size) {
      const found = new Set(denyPermissions.map((perm) => perm.id));
      const missing = [...denyIds].filter((id) => !found.has(id));
      throw new NotFoundException(
        `The following permissions targeted for revocation were not found: ${missing.join(', ')}`,
      );
    }

    admin.directPermissions.removeAll();
    allowPermissions.forEach((permission) =>
      admin.directPermissions.add(permission),
    );

    const em = this.adminRepository.getEntityManager();

    for (const override of admin.permissionOverrides.getItems()) {
      em.remove(override);
    }
    admin.permissionOverrides.removeAll();

    const overrides = denyPermissions.map((permission) =>
      this.overrideRepository.create({
        user: admin,
        permission,
        type: AdminPermissionOverrideType.DENY,
        createdAt: new Date(),
      }),
    );

    overrides.forEach((override) => {
      admin.permissionOverrides.add(override);
      em.persist(override);
    });

    await em.flush();

    await em.populate(admin, [
      'roles.permissions',
      'directPermissions',
      'permissionOverrides.permission',
    ]);

    return this.accessService.mapAdminUser(admin);
  }
}
