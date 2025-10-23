import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminAuthController } from './admin-auth.controller';
import { AdminLoginCommand } from '../commands/admin-login.command';
import type { AdminLoginResult } from '../contracts/admin-results';
import { AdminRole } from '../admin-role.enum';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
  });

  it('delegates login to AdminLoginCommand', async () => {
    const dto = {
      email: 'admin@example.com',
      password: 'ChangeMe123!',
    };

    const expected: AdminLoginResult = {
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: new Date().toISOString(),
      role: AdminRole.ADMIN,
      isSuperAdmin: false,
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
    expect(command.metadata).toEqual({
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  });
});
