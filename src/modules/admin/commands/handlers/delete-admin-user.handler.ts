import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { DeleteAdminUserCommand } from '../delete-admin-user.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';

@Injectable()
@CommandHandler(DeleteAdminUserCommand)
export class DeleteAdminUserHandler
  implements ICommandHandler<DeleteAdminUserCommand, void>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
  ) {}

  async execute(command: DeleteAdminUserCommand): Promise<void> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can remove admin users.',
      );
    }

    if (command.requester.adminId === command.targetAdminId) {
      throw new ForbiddenException('Admins cannot remove their own account.');
    }

    const admin = await this.adminRepository.findOne(command.targetAdminId);

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    await this.adminRepository.getEntityManager().removeAndFlush(admin);
  }
}
