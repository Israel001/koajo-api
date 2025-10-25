import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { UpdateAdminPodPlanHandler } from './update-admin-pod-plan.handler';
import { UpdateAdminPodPlanCommand } from '../update-admin-pod-plan.command';
import { AdminRole } from '../../admin-role.enum';

const buildCommand = (overrides: Partial<UpdateAdminPodPlanCommand['payload']> = {}): UpdateAdminPodPlanCommand =>
  new UpdateAdminPodPlanCommand(
    { adminId: 'admin-1', role: AdminRole.SUPER_ADMIN, isSuperAdmin: true },
    'plan-1',
    { amount: 60000, ...overrides },
  );

describe('UpdateAdminPodPlanHandler', () => {
  let handler: UpdateAdminPodPlanHandler;
  let podPlanRepository: {
    findOne: jest.Mock;
    getEntityManager: jest.Mock;
  };
  let podPlanService: {
    hasPodsWithRealMembers: jest.Mock;
    buildSummary: jest.Mock;
  };
  let flush: jest.Mock;

  beforeEach(() => {
    flush = jest.fn();
    podPlanRepository = {
      findOne: jest.fn(),
      getEntityManager: jest.fn(() => ({ flush })),
    } as any;

    podPlanService = {
      hasPodsWithRealMembers: jest.fn(),
      buildSummary: jest.fn(),
    } as any;

    handler = new UpdateAdminPodPlanHandler(
      podPlanRepository as any,
      podPlanService as any,
    );
  });

  it('rejects when requester is not super admin', async () => {
    const command = new UpdateAdminPodPlanCommand(
      { adminId: 'admin-1', role: AdminRole.ADMIN, isSuperAdmin: false },
      'plan-1',
      { amount: 60000 },
    );

    await expect(handler.execute(command)).rejects.toBeInstanceOf(ForbiddenException);
    expect(podPlanRepository.findOne).not.toHaveBeenCalled();
  });

  it('prevents changing the plan code', async () => {
    podPlanRepository.findOne.mockResolvedValue({
      id: 'plan-1',
      code: 'STANDARD-12',
      amount: 50000,
      lifecycleWeeks: 12,
      maxMembers: 10,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    podPlanService.hasPodsWithRealMembers.mockResolvedValue(false);

    const command = buildCommand({ code: 'DIFFERENT' });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(BadRequestException);
    expect(flush).not.toHaveBeenCalled();
  });

  it('blocks update when pods with real members exist', async () => {
    const entity = {
      id: 'plan-1',
      code: 'STANDARD-12',
      amount: 50000,
      lifecycleWeeks: 12,
      maxMembers: 10,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    podPlanRepository.findOne.mockResolvedValue(entity);
    podPlanService.hasPodsWithRealMembers.mockResolvedValue(true);

    await expect(handler.execute(buildCommand())).rejects.toBeInstanceOf(ConflictException);
    expect(flush).not.toHaveBeenCalled();
  });

  it('updates the plan when allowed', async () => {
    const entity = {
      id: 'plan-1',
      code: 'STANDARD-12',
      amount: 50000,
      lifecycleWeeks: 12,
      maxMembers: 10,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    podPlanRepository.findOne.mockResolvedValue(entity);
    podPlanService.hasPodsWithRealMembers.mockResolvedValue(false);
    podPlanService.buildSummary.mockResolvedValue({
      id: entity.id,
      code: entity.code,
      amount: 60000,
      lifecycleWeeks: 12,
      maxMembers: 10,
      active: true,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      totalPods: 0,
      podsWithMembers: 0,
      canEdit: true,
      canDelete: true,
    });

    const result = await handler.execute(buildCommand());

    expect(entity.amount).toEqual(60000);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(result.amount).toEqual(60000);
    expect(podPlanService.buildSummary).toHaveBeenCalledWith(entity);
  });
});
