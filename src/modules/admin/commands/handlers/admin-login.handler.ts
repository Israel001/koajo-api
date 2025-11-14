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

const ADMIN_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

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
    let permissions: string[];
    let requiresPasswordChange = false;

    if (adminUser) {
      const passwordMatch = await argon2.verify(
        adminUser.passwordHash,
        command.password,
      );

      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      if (adminUser.requiresPasswordChange && adminUser.lastLoginAt) {
        throw new UnauthorizedException(
          'Please reset your password before logging in again.',
        );
      }

      role = adminUser.role;
      subject = adminUser.id;
      permissions = this.accessService.computeEffectivePermissions(adminUser)
        .effective;
      requiresPasswordChange = adminUser.requiresPasswordChange;

      adminUser.lastLoginAt = now;
      await this.adminRepository.getEntityManager().flush();
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
      permissions = ['*'];
      requiresPasswordChange = false;
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

    const result: AdminLoginResult = {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      role,
      isSuperAdmin,
      permissions,
      requiresPasswordChange,
      refreshToken: null,
      refreshExpiresAt: null,
    };

    if (command.rememberMe) {
      const refresh = await this.createRefreshToken({
        subject,
        email,
        role,
        isSuperAdmin,
        issuedAt: now,
      });
      result.refreshToken = refresh.token;
      result.refreshExpiresAt = refresh.expiresAt.toISOString();
    }

    return result;
  }

  private timingSafeCompare(expected: string, provided: string): boolean {
    const bufferA = Buffer.from(expected);
    const bufferB = Buffer.from(provided);

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }

  private async createRefreshToken(params: {
    subject: string;
    email: string;
    role: AdminRole;
    isSuperAdmin: boolean;
    issuedAt: Date;
  }): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(
      params.issuedAt.getTime() + ADMIN_REFRESH_TOKEN_TTL_SECONDS * 1000,
    );

    const token = await this.jwtService.signAsync(
      {
        sub: `admin:${params.subject}`,
        email: params.email,
        role: params.role,
        scope: 'admin-refresh' as const,
        super: params.isSuperAdmin,
      },
      {
        expiresIn: ADMIN_REFRESH_TOKEN_TTL_SECONDS,
      },
    );

    return { token, expiresAt };
  }
}
