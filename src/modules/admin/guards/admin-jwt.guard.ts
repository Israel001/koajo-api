import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AdminRole } from '../admin-role.enum';

export interface AuthenticatedAdmin {
  adminId: string | null;
  email: string;
  role: AdminRole;
  isSuperAdmin: boolean;
}

export interface AdminAuthenticatedRequest extends Request {
  admin: AuthenticatedAdmin;
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

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

      request.admin = {
        adminId,
        email: payload.email,
        role: payload.role,
        isSuperAdmin: Boolean(payload.super),
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
