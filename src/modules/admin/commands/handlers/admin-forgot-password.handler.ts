import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminForgotPasswordCommand } from '../admin-forgot-password.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { AdminForgotPasswordResult } from '../../contracts/admin-results';
import { AdminPasswordResetService } from '../../services/admin-password-reset.service';

@Injectable()
@CommandHandler(AdminForgotPasswordCommand)
export class AdminForgotPasswordHandler
  implements ICommandHandler<AdminForgotPasswordCommand, AdminForgotPasswordResult>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly passwordResetService: AdminPasswordResetService,
  ) {}

  async execute(
    command: AdminForgotPasswordCommand,
  ): Promise<AdminForgotPasswordResult> {
    const email = command.email.trim().toLowerCase();
    const admin = await this.adminRepository.findOne({ email });

    if (admin) {
      await this.passwordResetService.issue(admin, {
        reason: 'admin-forgot-password',
      });
    }

    return {
      email,
      requested: true,
    };
  }
}
