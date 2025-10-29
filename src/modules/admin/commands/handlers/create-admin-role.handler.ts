import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { CreateAdminRoleCommand } from '../create-admin-role.command';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import type { AdminRoleSummary } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(CreateAdminRoleCommand)
export class CreateAdminRoleHandler
  implements ICommandHandler<CreateAdminRoleCommand, AdminRoleSummary>
{
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(command: CreateAdminRoleCommand): Promise<AdminRoleSummary> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can create roles.',
      );
    }

    const { name, description, permissionCodes } = command.payload;

    const normalizedName = name.trim();

    if (!normalizedName.length) {
      throw new BadRequestException('Role name must not be empty.');
    }

    const existing = await this.roleRepository.findOne({
      name: normalizedName,
    });

    if (existing) {
      throw new ConflictException(
        `An admin role named "${normalizedName}" already exists.`,
      );
    }

    const permissions = permissionCodes?.length
      ? await this.permissionRepository.find({
          code: { $in: permissionCodes.map((code) => code.trim()) },
        })
      : [];

    if (permissionCodes && permissions.length !== permissionCodes.length) {
      const found = new Set(permissions.map((permission) => permission.code));
      const missing = permissionCodes.filter((code) => !found.has(code));
      throw new NotFoundException(
        `The following permissions do not exist: ${missing.join(', ')}`,
      );
    }

    const role = this.roleRepository.create(
      {
        name: normalizedName,
        description: description?.trim() || null,
      },
      { partial: true },
    );

    permissions.forEach((permission) => role.permissions.add(permission));

    const em = this.roleRepository.getEntityManager();
    await em.persistAndFlush(role);
    await em.populate(role, ['permissions']);

    return this.accessService.mapRole(role);
  }
}
