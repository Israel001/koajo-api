import { UnauthorizedException } from '@nestjs/common';
import { AdminRefreshAccessTokenHandler } from './admin-refresh-access-token.handler';
import { AdminRefreshAccessTokenCommand } from '../admin-refresh-access-token.command';
import { AdminRole } from '../../admin-role.enum';

describe('AdminRefreshAccessTokenHandler', () => {
  let handler: AdminRefreshAccessTokenHandler;
  let jwtService: { verifyAsync: jest.Mock; signAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let adminRepository: { findOne: jest.Mock };
  let accessService: { computeEffectivePermissions: jest.Mock };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    adminRepository = {
      findOne: jest.fn(),
    } as any;

    accessService = {
      computeEffectivePermissions: jest.fn(),
    } as any;

    handler = new AdminRefreshAccessTokenHandler(
      jwtService as any,
      configService as any,
      adminRepository as any,
      accessService as any,
    );
  });

  it('issues a new access token for admin users', async () => {
    const refreshToken = 'refresh-token';
    const exp = Math.floor(Date.now() / 1000) + 3_600;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'admin:admin-1',
      email: 'admin@example.com',
      role: AdminRole.ADMIN,
      scope: 'admin-refresh',
      super: false,
      exp,
    });

    configService.get.mockImplementation((key: string) => {
      if (key === 'auth.jwt') {
        return { accessTtlSeconds: 900 };
      }
      return null;
    });

    const adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      role: AdminRole.ADMIN,
      isActive: true,
      requiresPasswordChange: false,
    } as any;

    adminRepository.findOne.mockResolvedValue(adminUser);
    accessService.computeEffectivePermissions.mockReturnValue({
      effective: ['admin.users.view'],
    });

    jwtService.signAsync.mockResolvedValue('new-access-token');

    const result = await handler.execute(
      new AdminRefreshAccessTokenCommand(refreshToken),
    );

    expect(result.accessToken).toEqual('new-access-token');
    expect(result.permissions).toEqual(['admin.users.view']);
    expect(result.isSuperAdmin).toBe(false);
    expect(result.refreshToken).toEqual(refreshToken);
    expect(result.refreshExpiresAt).toEqual(new Date(exp * 1000).toISOString());
    expect(adminRepository.findOne).toHaveBeenCalledWith(
      { id: 'admin-1' },
      expect.any(Object),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'admin:admin-1',
        scope: 'admin',
      }),
    );
  });

  it('issues a new access token for the super admin', async () => {
    const refreshToken = 'refresh-token';
    const exp = Math.floor(Date.now() / 1000) + 10_800;

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'admin:super-admin',
      email: 'superadmin@koajo.local',
      role: AdminRole.SUPER_ADMIN,
      scope: 'admin-refresh',
      super: true,
      exp,
    });

    configService.get.mockImplementation((key: string) => {
      if (key === 'auth.jwt') {
        return { accessTtlSeconds: 900 };
      }
      if (key === 'admin') {
        return {
          superAdmin: {
            email: 'superadmin@koajo.local',
          },
        };
      }
      return null;
    });

    jwtService.signAsync.mockResolvedValue('new-super-token');

    const result = await handler.execute(
      new AdminRefreshAccessTokenCommand(refreshToken),
    );

    expect(result.accessToken).toEqual('new-super-token');
    expect(result.isSuperAdmin).toBe(true);
    expect(result.permissions).toEqual(['*']);
    expect(result.refreshToken).toEqual(refreshToken);
    expect(result.refreshExpiresAt).toEqual(new Date(exp * 1000).toISOString());
    expect(adminRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws when refresh token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('boom'));

    await expect(
      handler.execute(new AdminRefreshAccessTokenCommand('bad-token')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
