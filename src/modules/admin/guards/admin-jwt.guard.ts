import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminRole } from '../admin-role.enum';
import { AdminUserEntity } from '../entities/admin-user.entity';
import { AdminAccessService } from '../services/admin-access.service';

export interface AuthenticatedAdmin {
  adminId: string | null;
  email: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  permissions: string[];
  requiresPasswordChange: boolean;
}

export interface AdminAuthenticatedRequest extends Request {
  admin: AuthenticatedAdmin;
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>();

    const token = this.extractBearerToken(request);

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        email?: string;
        role?: AdminRole;
        scope?: string;
        super?: boolean;
      }>(token);

      if (!payload?.sub || payload.scope !== 'admin') {
        throw new UnauthorizedException('Invalid access token payload.');
      }

      const adminId = this.parseAdminSubject(payload.sub);

      if (!payload.email || !payload.role) {
        throw new UnauthorizedException('Invalid access token payload.');
      }

      if (Boolean(payload.super) || adminId === null) {
        request.admin = {
          adminId,
          email: payload.email,
          role: payload.role,
          isSuperAdmin: true,
          permissions: ['*'],
          requiresPasswordChange: false,
        };
        return true;
      }

      const admin = await this.adminRepository.findOne(adminId, {
        populate: [
          'roles.permissions',
          'directPermissions',
          'permissionOverrides.permission',
        ],
      });

      if (!admin) {
        throw new UnauthorizedException('Admin user not found.');
      }

      if (!admin.isActive) {
        throw new UnauthorizedException('Admin account is inactive.');
      }

      const access = this.accessService.computeEffectivePermissions(admin);

      request.admin = {
        adminId,
        email: payload.email,
        role: payload.role,
        isSuperAdmin: false,
        permissions: access.effective,
        requiresPasswordChange: admin.requiresPasswordChange,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private extractBearerToken(request: Request): string {
    const header = request.headers.authorization;

    if (!header) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    const [scheme, token] = header.trim().split(/\s+/);

    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException(
        'Authorization header must be a Bearer token.',
      );
    }

    return token;
  }

  private parseAdminSubject(raw: string): string | null {
    if (!raw.startsWith('admin:')) {
      throw new UnauthorizedException('Invalid access token subject.');
    }

    const value = raw.slice('admin:'.length);
    return value === 'super-admin' ? null : value;
  }
}
