import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminPodPlansController } from './admin-pod-plans.controller';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import type { AdminAuthenticatedRequest } from '../guards/admin-jwt.guard';
import { ListAdminPodPlansQuery } from '../queries/list-admin-pod-plans.query';
import { CreateAdminPodPlanCommand } from '../commands/create-admin-pod-plan.command';
import { UpdateAdminPodPlanCommand } from '../commands/update-admin-pod-plan.command';
import { DeleteAdminPodPlanCommand } from '../commands/delete-admin-pod-plan.command';
import { AdminRole } from '../admin-role.enum';

const makeRequest = (): AdminAuthenticatedRequest =>
  ({
    admin: {
      adminId: 'admin-1',
      email: 'admin@example.com',
      role: AdminRole.SUPER_ADMIN,
      isSuperAdmin: true,
      permissions: ['*'],
      requiresPasswordChange: false,
    },
  } as unknown as AdminAuthenticatedRequest);

describe('AdminPodPlansController', () => {
  let controller: AdminPodPlansController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPodPlansController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
      ],
    })
      .overrideGuard(AdminJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AdminPodPlansController);
  });

  it('lists pod plans using the query bus', async () => {
    queryBus.execute.mockResolvedValue({ total: 0, items: [] });

    const result = await controller.list({ limit: 10, offset: 0 } as any);

    expect(result).toEqual({ total: 0, items: [] });
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAdminPodPlansQuery),
    );
  });

  it('creates pod plans via command bus', async () => {
    const payload = {
      code: 'STANDARD-12',
      amount: 50000,
      lifecycleWeeks: 12,
      maxMembers: 10,
    };

    commandBus.execute.mockResolvedValue({
      id: 'plan-1',
      code: payload.code,
      amount: payload.amount,
      lifecycleWeeks: payload.lifecycleWeeks,
      maxMembers: payload.maxMembers,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPods: 0,
      podsWithMembers: 0,
      canEdit: true,
      canDelete: true,
    });

    const response = await controller.create(payload as any, makeRequest() as unknown as Request);

    expect(response.code).toEqual(payload.code);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateAdminPodPlanCommand),
    );
  });

  it('updates pod plans via command bus', async () => {
    commandBus.execute.mockResolvedValue({
      id: 'plan-1',
      code: 'STANDARD-12',
      amount: 60000,
      lifecycleWeeks: 12,
      maxMembers: 10,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPods: 0,
      podsWithMembers: 0,
      canEdit: true,
      canDelete: true,
    });

    await controller.update(
      'plan-1',
      { amount: 60000 } as any,
      makeRequest() as unknown as Request,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateAdminPodPlanCommand),
    );
  });

  it('deletes pod plans via command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.delete('plan-1', makeRequest() as unknown as Request);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(DeleteAdminPodPlanCommand),
    );
  });
});
