import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { SetAdminRolePermissionsCommand } from '../set-admin-role-permissions.command';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import type { AdminRoleSummary } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(SetAdminRolePermissionsCommand)
export class SetAdminRolePermissionsHandler
  implements ICommandHandler<SetAdminRolePermissionsCommand, AdminRoleSummary>
{
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: SetAdminRolePermissionsCommand,
  ): Promise<AdminRoleSummary> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can modify role permissions.',
      );
    }

    const role = await this.roleRepository.findOne(command.roleId, {
      populate: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    const uniqueIds = Array.from(
      new Set(command.permissionCodes.map((id) => id.trim()).filter(Boolean)),
    );

    const permissions = uniqueIds.length
      ? await this.permissionRepository.find({ id: { $in: uniqueIds } })
      : [];

    if (permissions.length !== uniqueIds.length) {
      const found = new Set(permissions.map((permission) => permission.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `The following permissions do not exist: ${missing.join(', ')}`,
      );
    }

    role.permissions.removeAll();
    permissions.forEach((permission) => role.permissions.add(permission));

    await this.roleRepository.getEntityManager().flush();
    await this.roleRepository.getEntityManager().populate(role, ['permissions']);

    return this.accessService.mapRole(role);
  }
}
