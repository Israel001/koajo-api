import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { AdminLoginCommand } from '../admin-login.command';
import { AdminRole } from '../../admin-role.enum';
import type { AdminLoginResult } from '../../contracts/admin-results';
import type { AdminConfig } from '../../../../config/admin.config';
import { AdminAccessService } from '../../services/admin-access.service';

@Injectable()
@CommandHandler(AdminLoginCommand)
export class AdminLoginHandler
  implements ICommandHandler<AdminLoginCommand, AdminLoginResult>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(command: AdminLoginCommand): Promise<AdminLoginResult> {
    const email = command.email.trim().toLowerCase();
    const adminConfig = this.configService.get<AdminConfig>('admin', {
      infer: true,
    });

    if (!adminConfig) {
      throw new UnauthorizedException('Admin configuration is unavailable.');
    }

    const adminUser = await this.adminRepository.findOne(
      { email },
      {
        populate: [
          'roles.permissions',
          'directPermissions',
          'permissionOverrides.permission',
        ],
      },
    );

    const now = new Date();
    const jwtConfig = this.configService.get('auth.jwt', { infer: true })!;

    let role: AdminRole;
    let subject: string;
    let isSuperAdmin = false;

    if (adminUser) {
      const passwordMatch = await argon2.verify(
        adminUser.passwordHash,
        command.password,
      );

      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      role = adminUser.role;
      subject = adminUser.id;

      adminUser.lastLoginAt = now;
      await this.adminRepository.getEntityManager().flush();

      const access = this.accessService.computeEffectivePermissions(adminUser);

      const expiresAt = new Date(now.getTime() + jwtConfig.accessTtlSeconds * 1000);

      const payload = {
        sub: `admin:${adminUser.id}`,
        email,
        role,
        scope: 'admin' as const,
        super: false,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresAt: expiresAt.toISOString(),
        role,
        isSuperAdmin,
        permissions: access.effective,
        requiresPasswordChange: adminUser.requiresPasswordChange,
      };
    } else if (email === adminConfig.superAdmin.email) {
      const configuredHash = adminConfig.superAdmin.passwordHash;
      const configuredPassword = adminConfig.superAdmin.password;

      let valid = false;

      if (typeof configuredHash === 'string' && configuredHash.length > 0) {
        try {
          valid = await argon2.verify(configuredHash, command.password);
        } catch {
          valid = false;
        }
      } else if (typeof configuredPassword === 'string') {
        valid = this.timingSafeCompare(
          configuredPassword,
          command.password,
        );
      }

      if (!valid) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      role = AdminRole.SUPER_ADMIN;
      subject = 'super-admin';
      isSuperAdmin = true;
    } else {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const expiresAt = new Date(now.getTime() + jwtConfig.accessTtlSeconds * 1000);

    const payload = {
      sub: `admin:${subject}`,
      email,
      role,
      scope: 'admin' as const,
      super: isSuperAdmin,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      role,
      isSuperAdmin,
      permissions: ['*'],
      requiresPasswordChange: false,
    };
  }

  private timingSafeCompare(expected: string, provided: string): boolean {
    const bufferA = Buffer.from(expected);
    const bufferB = Buffer.from(provided);

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }
}
