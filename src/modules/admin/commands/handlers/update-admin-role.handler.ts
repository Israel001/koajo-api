import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAdminRoleCommand } from '../update-admin-role.command';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import type { AdminRoleSummary } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@CommandHandler(UpdateAdminRoleCommand)
export class UpdateAdminRoleHandler
  implements ICommandHandler<UpdateAdminRoleCommand, AdminRoleSummary>
{
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: UpdateAdminRoleCommand,
  ): Promise<AdminRoleSummary> {
    const role = await this.roleRepository.findOne(
      { id: command.roleId },
      { populate: ['permissions'] as const },
    );

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    const nextName = command.name?.trim();
    if (nextName) {
      const existing = await this.roleRepository.findOne({
        name: nextName,
        id: { $ne: role.id },
      });
      if (existing) {
        throw new ConflictException('Another role with this name already exists.');
      }
      role.name = nextName;
    }

    if (command.description !== null) {
      const desc = command.description?.trim();
      role.description = desc?.length ? desc : null;
    }

    await this.roleRepository.getEntityManager().flush();
    await this.roleRepository.getEntityManager().populate(role, ['permissions']);

    return this.accessService.mapRole(role);
  }
}
