import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { AdminResetPasswordCommand } from '../admin-reset-password.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { AdminResetPasswordResult } from '../../contracts/admin-results';
import { AdminPasswordResetService } from '../../services/admin-password-reset.service';

@Injectable()
@CommandHandler(AdminResetPasswordCommand)
export class AdminResetPasswordHandler
  implements
    ICommandHandler<AdminResetPasswordCommand, AdminResetPasswordResult>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly passwordResetService: AdminPasswordResetService,
  ) {}

  async execute(
    command: AdminResetPasswordCommand,
  ): Promise<AdminResetPasswordResult> {
    const email = command.email.trim().toLowerCase();
    const admin = await this.adminRepository.findOne({ email });

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    await this.passwordResetService.validate(admin, command.token.trim());

    const newPassword = command.newPassword.trim();

    admin.passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    admin.requiresPasswordChange = false;
    admin.passwordChangedAt = new Date();

    await this.adminRepository.getEntityManager().flush();

    return {
      email: admin.email,
      reset: true,
    };
  }
}
