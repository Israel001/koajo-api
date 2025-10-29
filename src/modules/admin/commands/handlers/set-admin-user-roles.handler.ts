import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { SetAdminUserRolesCommand } from '../set-admin-user-roles.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import type { AdminUserDto } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(SetAdminUserRolesCommand)
export class SetAdminUserRolesHandler
  implements ICommandHandler<SetAdminUserRolesCommand, AdminUserDto>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: SetAdminUserRolesCommand,
  ): Promise<AdminUserDto> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can assign roles to admin users.',
      );
    }

    if (command.requester.adminId === command.adminId) {
      throw new ForbiddenException('Admins cannot modify their own roles.');
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

    const uniqueRoleIds = Array.from(
      new Set(command.roleIds.map((id) => id.trim()).filter(Boolean)),
    );

    if (!uniqueRoleIds.length) {
      throw new BadRequestException('At least one role must be specified.');
    }

    const roles = await this.roleRepository.find(uniqueRoleIds, {
      populate: ['permissions'],
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new NotFoundException('One or more specified roles were not found.');
    }

    admin.roles.removeAll();
    roles.forEach((role) => admin.roles.add(role));

    await this.adminRepository.getEntityManager().flush();
    await this.adminRepository
      .getEntityManager()
      .populate(admin, [
        'roles.permissions',
        'directPermissions',
        'permissionOverrides.permission',
      ]);

    return this.accessService.mapAdminUser(admin);
  }
}
