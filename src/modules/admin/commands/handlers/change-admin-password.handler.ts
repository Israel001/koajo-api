import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { ChangeAdminPasswordCommand } from '../change-admin-password.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';

@Injectable()
@CommandHandler(ChangeAdminPasswordCommand)
export class ChangeAdminPasswordHandler
  implements ICommandHandler<ChangeAdminPasswordCommand, void>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
  ) {}

  async execute(command: ChangeAdminPasswordCommand): Promise<void> {
    const admin = await this.adminRepository.findOne(command.adminId);

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    const matches = await argon2.verify(admin.passwordHash, command.currentPassword);

    if (!matches) {
      throw new BadRequestException('Current password is incorrect.');
    }

    if (command.currentPassword === command.newPassword) {
      throw new BadRequestException('New password must differ from the current password.');
    }

    admin.passwordHash = await argon2.hash(command.newPassword, {
      type: argon2.argon2id,
    });
    admin.requiresPasswordChange = false;
    admin.passwordChangedAt = new Date();

    await this.adminRepository.getEntityManager().flush();
  }
}
