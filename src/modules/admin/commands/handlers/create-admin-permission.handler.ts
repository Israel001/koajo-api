import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { CreateAdminPermissionCommand } from '../create-admin-permission.command';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import type { AdminPermissionSummary } from '../../contracts/admin-results';

@Injectable()
@CommandHandler(CreateAdminPermissionCommand)
export class CreateAdminPermissionHandler
  implements
    ICommandHandler<CreateAdminPermissionCommand, AdminPermissionSummary>
{
  constructor(
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
  ) {}

  async execute(
    command: CreateAdminPermissionCommand,
  ): Promise<AdminPermissionSummary> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can create permissions.',
      );
    }

    const { code, name, description } = command.payload;
    const normalizedCode = code.trim();

    if (!normalizedCode.length) {
      throw new ConflictException('Permission code must not be empty.');
    }

    const existing = await this.permissionRepository.findOne({
      code: normalizedCode,
    });

    if (existing) {
      throw new ConflictException(
        `A permission with code \"${normalizedCode}\" already exists.`,
      );
    }

    const permission = this.permissionRepository.create(
      {
        code: normalizedCode,
        name: name?.trim() || null,
        description: description?.trim() || null,
      },
      { partial: true },
    );

    await this.permissionRepository.getEntityManager().persistAndFlush(permission);

    return {
      id: permission.id,
      code: permission.code,
      name: permission.name ?? null,
      description: permission.description ?? null,
    };
  }
}
