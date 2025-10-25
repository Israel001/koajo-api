import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminUsersController } from './admin-users.controller';
import { CreateAdminUserCommand } from '../commands/create-admin-user.command';
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
        role: AdminRole.ADMIN,
        createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        lastLoginAt: null,
      },
    ]);

    const result = await controller.list();

    expect(result).toHaveLength(1);
    expect(result[0].email).toEqual('admin@example.com');
    expect(queryBus.execute).toHaveBeenCalledTimes(1);
  });

  it('creates admin users via command bus', async () => {
    const dto = {
      email: 'new-admin@example.com',
      password: 'Str0ngP@ss!',
    };

    const request = {
      admin: {
        adminId: 'admin-1',
        email: 'admin@example.com',
        role: AdminRole.SUPER_ADMIN,
        isSuperAdmin: true,
      },
    } as unknown as AdminAuthenticatedRequest;

    commandBus.execute.mockResolvedValue({
      id: 'admin-2',
      email: dto.email,
      role: AdminRole.ADMIN,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });

    await controller.create(dto as any, request);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateAdminUserCommand));
    const command = commandBus.execute.mock.calls[0][0] as CreateAdminUserCommand;
    expect(command.email).toEqual(dto.email);
    expect(command.role).toEqual(AdminRole.ADMIN);
  });
});
