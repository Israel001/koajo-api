import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminRefreshAccessTokenCommand } from '../admin-refresh-access-token.command';
import type { AdminLoginResult } from '../../contracts/admin-results';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { AdminConfig } from '../../../../config/admin.config';
import { AdminAccessService } from '../../services/admin-access.service';
import { AdminRole } from '../../admin-role.enum';

const ADMIN_REFRESH_SCOPE = 'admin-refresh';

@Injectable()
@CommandHandler(AdminRefreshAccessTokenCommand)
export class AdminRefreshAccessTokenHandler
  implements ICommandHandler<AdminRefreshAccessTokenCommand, AdminLoginResult>
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(
    command: AdminRefreshAccessTokenCommand,
  ): Promise<AdminLoginResult> {
    const payload = await this.verifyRefreshToken(command.refreshToken);

    if (payload.scope !== ADMIN_REFRESH_SCOPE) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const subject = this.extractSubject(payload.sub);
    const jwtConfig = this.configService.get('auth.jwt', { infer: true });

    if (!jwtConfig) {
      throw new UnauthorizedException('Unable to issue access token.');
    }

    const expiresAt = new Date(Date.now() + jwtConfig.accessTtlSeconds * 1000);
    const refreshExpiresAt = payload.exp
      ? new Date(payload.exp * 1000).toISOString()
      : null;

    if (payload.super) {
      return this.issueForSuperAdmin(
        command.refreshToken,
        payload,
        expiresAt,
        refreshExpiresAt,
      );
    }

    const adminUser = await this.adminRepository.findOne(
      { id: subject },
      {
        populate: [
          'roles.permissions',
          'directPermissions',
          'permissionOverrides.permission',
        ],
      },
    );

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const access = this.accessService.computeEffectivePermissions(adminUser);

    const accessToken = await this.jwtService.signAsync({
      sub: `admin:${adminUser.id}`,
      email: adminUser.email,
      role: adminUser.role,
      scope: 'admin' as const,
      super: false,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      role: adminUser.role,
      isSuperAdmin: false,
      permissions: access.effective,
      requiresPasswordChange: adminUser.requiresPasswordChange,
      refreshToken: command.refreshToken,
      refreshExpiresAt,
    };
  }

  private async issueForSuperAdmin(
    refreshToken: string,
    payload: {
      email: string;
      role: AdminRole;
      sub: string;
    },
    expiresAt: Date,
    refreshExpiresAt: string | null,
  ): Promise<AdminLoginResult> {
    const adminConfig = this.configService.get<AdminConfig>('admin', {
      infer: true,
    });

    if (
      !adminConfig ||
      payload.email !== adminConfig.superAdmin.email ||
      payload.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: payload.sub,
      email: payload.email,
      role: AdminRole.SUPER_ADMIN,
      scope: 'admin' as const,
      super: true,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt.toISOString(),
      role: AdminRole.SUPER_ADMIN,
      isSuperAdmin: true,
      permissions: ['*'],
      requiresPasswordChange: false,
      refreshToken,
      refreshExpiresAt,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{
    sub: string;
    email: string;
    role: AdminRole;
    scope: string;
    super?: boolean;
    exp?: number;
  }> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private extractSubject(sub: string): string {
    const prefix = 'admin:';
    if (!sub?.startsWith(prefix)) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return sub.slice(prefix.length);
  }
}
