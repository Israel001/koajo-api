import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminPodsController } from './admin-pods.controller';
import type { AdminPodStatistics } from '../contracts/admin-results';

describe('AdminPodsController', () => {
  let controller: AdminPodsController;
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPodsController],
      providers: [
        {
          provide: QueryBus,
          useValue: queryBus,
        },
      ],
    }).compile();

    controller = module.get<AdminPodsController>(AdminPodsController);
  });

  it('returns pod statistics', async () => {
    const stats: AdminPodStatistics = {
      totalOpenPods: 5,
      totalMembers: 120,
      totalPendingInvites: 8,
      totalIncompletePods: 12,
    };

    queryBus.execute.mockResolvedValue(stats);

    await expect(controller.stats()).resolves.toEqual(stats);
    expect(queryBus.execute).toHaveBeenCalled();
  });

  it('lists pod activities via query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    const result = await controller.listActivities('pod-1', { limit: 10 } as any);

    expect(result).toEqual([]);
    expect(queryBus.execute).toHaveBeenCalled();
  });
});
