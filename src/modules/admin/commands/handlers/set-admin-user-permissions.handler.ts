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
  implements
    ICommandHandler<SetAdminUserPermissionsCommand, AdminUserDto>
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
      throw new ForbiddenException('Admins cannot modify their own permissions.');
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

    const allowCodes = new Set(
      allowSource.map((code) => code.trim()).filter(Boolean),
    );
    const denyCodes = new Set(
      denySource.map((code) => code.trim()).filter(Boolean),
    );

    for (const code of allowCodes) {
      if (denyCodes.has(code)) {
        throw new BadRequestException(
          `Permission code "${code}" cannot be both allowed and denied.`,
        );
      }
    }

    const allowPermissions = allowCodes.size
      ? await this.permissionRepository.find({ code: { $in: [...allowCodes] } })
      : [];

    if (allowPermissions.length !== allowCodes.size) {
      const found = new Set(allowPermissions.map((perm) => perm.code));
      const missing = [...allowCodes].filter((code) => !found.has(code));
      throw new NotFoundException(
        `The following permissions could not be found: ${missing.join(', ')}`,
      );
    }

    const denyPermissions = denyCodes.size
      ? await this.permissionRepository.find({ code: { $in: [...denyCodes] } })
      : [];

    if (denyPermissions.length !== denyCodes.size) {
      const found = new Set(denyPermissions.map((perm) => perm.code));
      const missing = [...denyCodes].filter((code) => !found.has(code));
      throw new NotFoundException(
        `The following permissions targeted for revocation were not found: ${missing.join(', ')}`,
      );
    }

    admin.directPermissions.removeAll();
    allowPermissions.forEach((permission) => admin.directPermissions.add(permission));

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
