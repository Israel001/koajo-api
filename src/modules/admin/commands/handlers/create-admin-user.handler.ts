import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { CreateAdminUserCommand } from '../create-admin-user.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { CreateAdminUserResult } from '../../contracts/admin-results';
import { AdminRole } from '../../admin-role.enum';

@Injectable()
@CommandHandler(CreateAdminUserCommand)
export class CreateAdminUserHandler
  implements ICommandHandler<CreateAdminUserCommand, CreateAdminUserResult>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
  ) {}

  async execute(
    command: CreateAdminUserCommand,
  ): Promise<CreateAdminUserResult> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can create new admin users.',
      );
    }

    const email = command.email.trim().toLowerCase();
    const existing = await this.adminRepository.findOne({ email });

    if (existing) {
      throw new ConflictException('An admin user already exists with that email.');
    }

    const entity = this.adminRepository.create(
      {
        email,
        passwordHash: await argon2.hash(command.password, {
          type: argon2.argon2id,
        }),
        role: command.role ?? AdminRole.ADMIN,
      },
      { partial: true },
    );

    await this.adminRepository.getEntityManager().persistAndFlush(entity);

    return {
      id: entity.id,
      email: entity.email,
      role: entity.role,
      createdAt: entity.createdAt.toISOString(),
      lastLoginAt: entity.lastLoginAt ? entity.lastLoginAt.toISOString() : null,
    };
  }
}
