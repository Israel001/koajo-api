import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AdminAuthenticatedRequest,
  AuthenticatedAdmin,
} from './admin-jwt.guard';

export const ADMIN_PERMISSIONS_KEY = 'admin:permissions';

export const RequireAdminPermissions = (...permissions: string[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AdminAuthenticatedRequest>();

    const admin = request.admin as AuthenticatedAdmin | undefined;

    if (!admin) {
      throw new UnauthorizedException('Admin authentication context missing.');
    }

    const required = this.reflector.getAllAndMerge<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || !required.length) {
      return true;
    }

    if (admin.isSuperAdmin || admin.permissions.includes('*')) {
      return true;
    }

    const missing = required.filter(
      (permission) => !admin.permissions.includes(permission),
    );

    if (missing.length) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
