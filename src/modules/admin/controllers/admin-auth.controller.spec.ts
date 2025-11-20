import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminAuthController } from './admin-auth.controller';
import { AdminLoginCommand } from '../commands/admin-login.command';
import type {
  AdminChangePasswordResult,
  AdminForgotPasswordResult,
  AdminLoginResult,
  AdminResetPasswordResult,
  AdminSelfProfileResult,
  AdminUserDto,
} from '../contracts/admin-results';
import { AdminRole } from '../admin-role.enum';
import { ChangeAdminPasswordCommand } from '../commands/change-admin-password.command';
import { AdminForgotPasswordCommand } from '../commands/admin-forgot-password.command';
import { AdminResetPasswordCommand } from '../commands/admin-reset-password.command';
import { AdminRefreshAccessTokenCommand } from '../commands/admin-refresh-access-token.command';
import type { AdminAuthenticatedRequest } from '../guards/admin-jwt.guard';
import { GetAdminUserQuery } from '../queries/get-admin-user.query';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  it('delegates login to AdminLoginCommand', async () => {
    const dto = {
      email: 'admin@example.com',
      password: 'ChangeMe123!',
      rememberMe: true,
    };

    const expected: AdminLoginResult = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date().toISOString(),
      role: AdminRole.ADMIN,
      isSuperAdmin: false,
      permissions: ['admin.users.view'],
      requiresPasswordChange: false,
      refreshToken: 'refresh',
      refreshExpiresAt: new Date().toISOString(),
    };

    commandBus.execute.mockResolvedValue(expected);

    const request = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as unknown as Request;

    await expect(controller.login(dto as any, request)).resolves.toEqual(expected);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(AdminLoginCommand));
    const command = commandBus.execute.mock.calls[0][0] as AdminLoginCommand;
    expect(command.email).toEqual(dto.email);
    expect(command.password).toEqual(dto.password);
    expect(command.rememberMe).toBe(true);
    expect(command.metadata).toEqual({
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });

  it('changes password for authenticated admins via command bus', async () => {
    const dto = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    };

    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.ADMIN,
        isSuperAdmin: false,
        permissions: ['admin.users.view'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue(undefined);

    await expect(
      controller.changePassword(dto as any, request as unknown as Request),
    ).resolves.toEqual<AdminChangePasswordResult>({ success: true });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(ChangeAdminPasswordCommand),
    );
    const command =
      commandBus.execute.mock.calls[0][0] as ChangeAdminPasswordCommand;
    expect(command.adminId).toEqual('admin-1');
    expect(command.currentPassword).toEqual(dto.currentPassword);
    expect(command.newPassword).toEqual(dto.newPassword);
  });

  it('requests forgot password flow', async () => {
    const dto = {
      email: 'admin@example.com',
    };

    const expected: AdminForgotPasswordResult = {
      email: dto.email,
      requested: true,
    };

    commandBus.execute.mockResolvedValue(expected);

    await expect(
      controller.forgotPassword(dto as any),
    ).resolves.toEqual(expected);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AdminForgotPasswordCommand),
    );
  });

  it('resets password with token', async () => {
    const dto = {
      email: 'admin@example.com',
      token: 'token123',
      newPassword: 'NewPass123!',
    };

    const expected: AdminResetPasswordResult = {
      email: dto.email,
      reset: true,
    };

    commandBus.execute.mockResolvedValue(expected);

    await expect(
      controller.resetPassword(dto as any),
    ).resolves.toEqual(expected);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AdminResetPasswordCommand),
    );
  });

  it('exchanges refresh token for access token', async () => {
    const expected: AdminLoginResult = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date().toISOString(),
      role: AdminRole.ADMIN,
      isSuperAdmin: false,
      permissions: ['admin.users.view'],
      requiresPasswordChange: false,
      refreshToken: 'refresh',
      refreshExpiresAt: new Date().toISOString(),
    };

    commandBus.execute.mockResolvedValue(expected);

    await expect(
      controller.refresh({ refreshToken: 'refresh' } as any),
    ).resolves.toEqual(expected);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AdminRefreshAccessTokenCommand),
    );
  });

  it('returns profile for stored admins', async () => {
    const adminProfile: AdminUserDto = {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      phoneNumber: '123',
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invitedAt: null,
      invitedById: null,
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: ['admin.users.view'],
    };
    queryBus.execute.mockResolvedValue(adminProfile);

    const request = {
      admin: {
        adminId: 'admin-1',
        email: adminProfile.email,
        role: AdminRole.ADMIN,
        isSuperAdmin: false,
        permissions: ['admin.users.view'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    const result = await controller.me(request as unknown as Request);

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetAdminUserQuery),
    );

    const expected: AdminSelfProfileResult = {
      id: adminProfile.id,
      email: adminProfile.email,
      firstName: adminProfile.firstName,
      lastName: adminProfile.lastName,
      phoneNumber: adminProfile.phoneNumber,
      role: AdminRole.ADMIN,
      isActive: true,
      isSuperAdmin: false,
      requiresPasswordChange: false,
      createdAt: adminProfile.createdAt,
      updatedAt: adminProfile.updatedAt,
      invitedAt: null,
      invitedById: null,
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: ['admin.users.view'],
    };

    expect(result).toEqual(expected);
  });

  it('returns minimal profile for super admin', async () => {
    const request = {
      admin: {
        adminId: null,
        email: 'super@admin.local',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['*'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    const result = await controller.me(request as unknown as Request);

    expect(queryBus.execute).not.toHaveBeenCalled();

    const expected: AdminSelfProfileResult = {
      id: null,
      email: 'super@admin.local',
      firstName: null,
      lastName: null,
      phoneNumber: null,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      isSuperAdmin: true,
      requiresPasswordChange: false,
      createdAt: null,
      updatedAt: null,
      invitedAt: null,
      invitedById: null,
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: ['*'],
    };

    expect(result).toEqual(expected);
  });
});
