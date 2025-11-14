import { UnauthorizedException } from '@nestjs/common';
import { AdminLoginHandler } from './admin-login.handler';
import { AdminLoginCommand } from '../admin-login.command';
import { AdminRole } from '../../admin-role.enum';

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));

const argon2 = jest.requireMock('argon2') as { verify: jest.Mock };

describe('AdminLoginHandler', () => {
  let handler: AdminLoginHandler;
  let adminRepository: {
    findOne: jest.Mock;
    getEntityManager: jest.Mock;
  };
  let entityManager: { flush: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let accessService: { computeEffectivePermissions: jest.Mock };

  beforeEach(() => {
    entityManager = { flush: jest.fn() };
    adminRepository = {
      findOne: jest.fn(),
      getEntityManager: jest.fn(() => entityManager),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'admin') {
          return { superAdmin: { email: 'super@example.com' } };
        }
        if (key === 'auth.jwt') {
          return { accessTtlSeconds: 3600 };
        }
        return null;
      }),
    };
    accessService = {
      computeEffectivePermissions: jest.fn().mockReturnValue({
        effective: ['admin.users.view'],
      }),
    };

    handler = new AdminLoginHandler(
      adminRepository as any,
      jwtService as any,
      configService as any,
      accessService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildAdminUser = (overrides?: Partial<Record<string, unknown>>) => ({
    id: 'admin-1',
    email: 'admin@example.com',
    passwordHash: 'hash',
    role: AdminRole.ADMIN,
    requiresPasswordChange: true,
    lastLoginAt: null,
    roles: [],
    directPermissions: [],
    permissionOverrides: [],
    ...overrides,
  });

  it('allows first login when password reset is still required', async () => {
    const adminUser = buildAdminUser({ lastLoginAt: null });
    adminRepository.findOne.mockResolvedValue(adminUser);
    argon2.verify.mockResolvedValue(true);

    await expect(
      handler.execute(new AdminLoginCommand(adminUser.email, 'Secret123!', false)),
    ).resolves.toMatchObject({
      requiresPasswordChange: true,
    });

    expect(entityManager.flush).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  it('blocks repeated login until password is changed', async () => {
    const adminUser = buildAdminUser({
      lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    });
    adminRepository.findOne.mockResolvedValue(adminUser);
    argon2.verify.mockResolvedValue(true);

    await expect(
      handler.execute(new AdminLoginCommand(adminUser.email, 'Secret123!', false)),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(entityManager.flush).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
