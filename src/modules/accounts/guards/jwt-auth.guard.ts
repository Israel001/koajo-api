import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedUser {
  accountId: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const header = this.extractAuthorizationHeader(request);
    const token = this.extractBearerToken(header);

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        email?: string;
        scope?: string;
      }>(token);

      if (!payload?.sub || payload.scope !== 'user') {
        throw new UnauthorizedException('Invalid access token payload.');
      }

      request.user = {
        accountId: payload.sub,
        email: payload.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private extractAuthorizationHeader(request: Request): string {
    const headerValue = request.headers?.authorization;

    if (!headerValue) {
      throw new UnauthorizedException('Missing Authorization header.');
    }

    if (Array.isArray(headerValue)) {
      throw new UnauthorizedException(
        'Multiple Authorization headers supplied.',
      );
    }

    return headerValue;
  }

  private extractBearerToken(header: string): string {
    const [scheme, token] = header.trim().split(/\s+/);

    if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
      throw new UnauthorizedException(
        'Authorization header must be a Bearer token.',
      );
    }

    return token;
  }
}
