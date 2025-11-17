import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { DeleteAdminRoleCommand } from '../delete-admin-role.command';
import { AdminRoleEntity } from '../../entities/admin-role.entity';

@CommandHandler(DeleteAdminRoleCommand)
export class DeleteAdminRoleHandler
  implements ICommandHandler<DeleteAdminRoleCommand, { deleted: boolean }>
{
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
  ) {}

  async execute(
    command: DeleteAdminRoleCommand,
  ): Promise<{ deleted: boolean }> {
    const role = await this.roleRepository.findOne(
      { id: command.roleId },
      { populate: ['users'] as const },
    );

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    await role.users.init();
    if (role.users.count() > 0) {
      throw new BadRequestException(
        'Role cannot be deleted while assigned to users.',
      );
    }

    await this.roleRepository.getEntityManager().removeAndFlush(role);
    return { deleted: true };
  }
}
