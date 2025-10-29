import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminUsersController } from './admin-users.controller';
import { CreateAdminUserCommand } from '../commands/create-admin-user.command';
import { UpdateAdminUserProfileCommand } from '../commands/update-admin-user-profile.command';
import { DeleteAdminUserCommand } from '../commands/delete-admin-user.command';
import { SetAdminUserRolesCommand } from '../commands/set-admin-user-roles.command';
import { SetAdminUserPermissionsCommand } from '../commands/set-admin-user-permissions.command';
import { GetAdminUserQuery } from '../queries/get-admin-user.query';
import { ListAdminUsersQuery } from '../queries/list-admin-users.query';
import type { AdminAuthenticatedRequest } from '../guards/admin-jwt.guard';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminRole } from '../admin-role.enum';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    };

    queryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
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
    })
      .overrideGuard(AdminJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('lists admin users', async () => {
    queryBus.execute.mockResolvedValue([
      {
        id: 'admin-1',
        email: 'admin@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: null,
        isActive: true,
        requiresPasswordChange: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        invitedAt: null,
        invitedById: null,
        lastLoginAt: null,
        roles: [],
        explicitPermissions: [],
        deniedPermissions: [],
        effectivePermissions: [],
      },
    ]);

    const result = await controller.list();

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('admin@example.com');
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAdminUsersQuery),
    );
  });

  it('creates admin users via command bus', async () => {
    const dto = {
      email: 'new-admin@example.com',
      roleIds: ['role-1'],
      generatePassword: true,
    };

    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['admin.manage_users'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue({
      id: 'admin-2',
      email: dto.email,
      firstName: null,
      lastName: null,
      phoneNumber: null,
      isActive: true,
      requiresPasswordChange: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invitedAt: new Date().toISOString(),
      invitedById: 'admin-1',
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: [],
      temporaryPassword: 'Temp1234!'
    });

    await controller.create(dto as any, request);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateAdminUserCommand));
    const command = commandBus.execute.mock.calls[0][0] as CreateAdminUserCommand;
    expect(command.payload.email).toEqual(dto.email);
    expect(command.payload.roleIds).toEqual(dto.roleIds);
    expect(command.payload.generatePassword).toBe(true);
  });

  it('fetches a single admin user', async () => {
    queryBus.execute.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: null,
      lastName: null,
      phoneNumber: null,
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
      effectivePermissions: [],
    });

    const result = await controller.get('admin-1');

    expect(result.id).toEqual('admin-1');
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetAdminUserQuery),
    );
  });

  it('updates admin user profiles', async () => {
    const dto = {
      firstName: 'Ada',
      lastName: 'Lovelace',
    };

    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['admin.manage_users'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue({
      id: 'admin-2',
      email: 'updated@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: null,
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invitedAt: null,
      invitedById: 'admin-1',
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: [],
    });

    await controller.update('admin-2', dto as any, request);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateAdminUserProfileCommand),
    );
  });

  it('deletes admin users', async () => {
    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['admin.manage_users'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue(undefined);

    await controller.delete('admin-2', request);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteAdminUserCommand),
    );
  });

  it('sets admin user roles', async () => {
    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['admin.manage_users'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue({
      id: 'admin-2',
      email: 'updated@example.com',
      firstName: null,
      lastName: null,
      phoneNumber: null,
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invitedAt: null,
      invitedById: 'admin-1',
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: [],
    });

    await controller.setRoles(
      'admin-2',
      { roleIds: ['role-1'] } as any,
      request,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(SetAdminUserRolesCommand),
    );
  });

  it('sets admin user permissions', async () => {
    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
        permissions: ['admin.manage_users'],
        requiresPasswordChange: false,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue({
      id: 'admin-2',
      email: 'updated@example.com',
      firstName: null,
      lastName: null,
      phoneNumber: null,
      isActive: true,
      requiresPasswordChange: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invitedAt: null,
      invitedById: 'admin-1',
      lastLoginAt: null,
      roles: [],
      explicitPermissions: [],
      deniedPermissions: [],
      effectivePermissions: [],
    });

    await controller.setPermissions(
      'admin-2',
      { allow: ['admin.manage_users'], deny: [] } as any,
      request,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(SetAdminUserPermissionsCommand),
    );
  });
});
