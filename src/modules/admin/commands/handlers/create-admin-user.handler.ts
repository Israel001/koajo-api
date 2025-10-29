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
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { CreateAdminUserCommand } from '../create-admin-user.command';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { CreateAdminUserResult } from '../../contracts/admin-results';
import { AdminRole } from '../../admin-role.enum';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import {
  AdminPermissionOverrideType,
  AdminUserPermissionOverrideEntity,
} from '../../entities/admin-user-permission-override.entity';
import { MailService } from '../../../../common/notification/mail.service';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(CreateAdminUserCommand)
export class CreateAdminUserHandler
  implements ICommandHandler<CreateAdminUserCommand, CreateAdminUserResult>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
    @InjectRepository(AdminUserPermissionOverrideEntity)
    private readonly overrideRepository: EntityRepository<AdminUserPermissionOverrideEntity>,
    private readonly mailService: MailService,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: CreateAdminUserCommand,
  ): Promise<CreateAdminUserResult> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can create new admin users.',
      );
    }

    const {
      email: rawEmail,
      firstName,
      lastName,
      phoneNumber,
      roleIds,
      allowPermissions,
      denyPermissions,
      password,
      generatePassword,
      inviteTemplateCode,
    } = command.payload;

    const email = rawEmail.trim().toLowerCase();
    const existing = await this.adminRepository.findOne({ email });

    if (existing) {
      throw new ConflictException(
        'An admin user already exists with that email.',
      );
    }

    const uniqueRoleIds = Array.from(
      new Set(roleIds.map((value) => value.trim())),
    ).filter((value) => value.length);

    if (!uniqueRoleIds.length) {
      throw new BadRequestException(
        'At least one role must be specified for the admin user.',
      );
    }

    const roles = await this.roleRepository.find(uniqueRoleIds, {
      populate: ['permissions'],
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new NotFoundException(
        'One or more roles specified for the admin user were not found.',
      );
    }

    const allowCodes = new Set(
      (allowPermissions ?? [])
        .map((code) => code.trim())
        .filter((code) => code.length),
    );
    const denyCodes = new Set(
      (denyPermissions ?? [])
        .map((code) => code.trim())
        .filter((code) => code.length),
    );

    for (const code of allowCodes) {
      if (denyCodes.has(code)) {
        throw new BadRequestException(
          `Permission code "${code}" cannot be both explicitly allowed and denied.`,
        );
      }
    }

    const allowPermissionEntities = allowCodes.size
      ? await this.permissionRepository.find({ code: { $in: [...allowCodes] } })
      : [];

    if (allowPermissionEntities.length !== allowCodes.size) {
      const found = new Set(allowPermissionEntities.map((perm) => perm.code));
      const missing = [...allowCodes].filter((code) => !found.has(code));
      throw new NotFoundException(
        `The following permissions targeted for explicit inclusion were not found: ${missing.join(', ')}`,
      );
    }

    const denyPermissionEntities = denyCodes.size
      ? await this.permissionRepository.find({ code: { $in: [...denyCodes] } })
      : [];

    if (denyPermissionEntities.length !== denyCodes.size) {
      const found = new Set(denyPermissionEntities.map((perm) => perm.code));
      const missing = [...denyCodes].filter((code) => !found.has(code));
      throw new NotFoundException(
        `The following permissions targeted for removal were not found: ${missing.join(', ')}`,
      );
    }

    const plainPassword = generatePassword
      ? this.generateSecurePassword()
      : password?.trim();

    if (!plainPassword) {
      throw new BadRequestException(
        'A password must be provided when automatic password generation is disabled.',
      );
    }

    const now = new Date();

    const admin = this.adminRepository.create(
      {
        email,
        passwordHash: await argon2.hash(plainPassword, {
          type: argon2.argon2id,
        }),
        role: AdminRole.ADMIN,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
        requiresPasswordChange: true,
        invitedAt: now,
        invitedById: command.requester.adminId,
      },
      { partial: true },
    );

    for (const role of roles) {
      admin.roles.add(role);
    }

    for (const permission of allowPermissionEntities) {
      admin.directPermissions.add(permission);
    }

    const overrides = denyPermissionEntities.map((permission) =>
      this.overrideRepository.create({
        user: admin,
        permission,
        type: AdminPermissionOverrideType.DENY,
        createdAt: new Date(),
      }),
    );

    const em = this.adminRepository.getEntityManager();
    em.persist(admin);
    overrides.forEach((override) => em.persist(override));
    await em.flush();

    await em.populate(admin, [
      'roles.permissions',
      'directPermissions',
      'permissionOverrides.permission',
    ]);

    try {
      await this.mailService.sendAdminInvite(email, {
        password: plainPassword,
        templateCode: inviteTemplateCode ?? 'admin_invite',
        variables: {
          firstname: admin.firstName ?? admin.email.split('@')[0],
          lastname: admin.lastName ?? '',
        },
      });
    } catch {
      // Mail errors are logged within the service; continue.
    }

    const dto = this.accessService.mapAdminUser(admin);

    return {
      ...dto,
      temporaryPassword: generatePassword ? plainPassword : undefined,
    };
  }

  private generateSecurePassword(): string {
    const raw = randomBytes(12).toString('base64url');
    const hasUpper = /[A-Z]/.test(raw);
    const hasLower = /[a-z]/.test(raw);
    const hasDigit = /\d/.test(raw);
    const hasSymbol = /[^A-Za-z0-9]/.test(raw);

    if (hasUpper && hasLower && hasDigit && hasSymbol) {
      return raw;
    }

    let password = raw;
    if (!hasUpper) {
      password += 'A';
    }
    if (!hasLower) {
      password += 'a';
    }
    if (!hasDigit) {
      password += '3';
    }
    if (!hasSymbol) {
      password += '!';
    }

    return password;
  }
}
