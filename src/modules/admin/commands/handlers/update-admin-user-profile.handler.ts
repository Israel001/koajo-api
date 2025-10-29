import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAdminUserProfileCommand } from '../update-admin-user-profile.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { AdminUserDto } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(UpdateAdminUserProfileCommand)
export class UpdateAdminUserProfileHandler
  implements ICommandHandler<UpdateAdminUserProfileCommand, AdminUserDto>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: UpdateAdminUserProfileCommand,
  ): Promise<AdminUserDto> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can update admin profiles.',
      );
    }

    if (command.requester.adminId === command.targetAdminId) {
      throw new ForbiddenException('Admins cannot update their own profile.');
    }

    const admin = await this.adminRepository.findOne(command.targetAdminId, {
      populate: [
        'roles.permissions',
        'directPermissions',
        'permissionOverrides.permission',
      ],
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    const normalizedEmail = command.payload.email
      ?.trim()
      .toLowerCase();

    if (normalizedEmail && normalizedEmail !== admin.email) {
      const existing = await this.adminRepository.findOne({
        email: normalizedEmail,
      });

      if (existing) {
        throw new ConflictException(
          'Another admin user already exists with that email address.',
        );
      }

      admin.email = normalizedEmail;
    }

    if (command.payload.firstName !== undefined) {
      admin.firstName = command.payload.firstName?.trim() || null;
    }

    if (command.payload.lastName !== undefined) {
      admin.lastName = command.payload.lastName?.trim() || null;
    }

    if (command.payload.phoneNumber !== undefined) {
      admin.phoneNumber = command.payload.phoneNumber?.trim() || null;
    }

    if (command.payload.isActive !== undefined && command.payload.isActive !== null) {
      admin.isActive = Boolean(command.payload.isActive);
    }

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
