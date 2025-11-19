import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminPodsController } from './admin-pods.controller';
import type { AdminPodStatistics } from '../contracts/admin-results';
import { MarkPodMembershipPaidCommand } from '../../pods/commands/mark-pod-membership-paid.command';

describe('AdminPodsController', () => {
  let controller: AdminPodsController;
  let queryBus: { execute: jest.Mock };
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    queryBus = {
      execute: jest.fn(),
    };
    commandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPodsController],
      providers: [
        {
          provide: QueryBus,
          useValue: queryBus,
        },
        {
          provide: CommandBus,
          useValue: commandBus,
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

  it('marks a membership payout via the command bus', async () => {
    const membership = {
      id: 'membership-1',
      pod: { id: 'pod-1' },
      payoutAmount: '500.00',
      payoutDate: new Date(),
    } as any;

    commandBus.execute
      .mockResolvedValueOnce(membership)
      .mockResolvedValueOnce({
        payoutId: 'payout-1',
        status: 'processing',
        stripeReference: 'ref',
        amount: '500.00',
        fee: '0.00',
      });

    const result = await controller.markPayout('pod-1', {
      membershipId: 'membership-1',
      amount: 500,
    } as any);

    expect(result.membershipId).toBe('membership-1');
    expect(commandBus.execute).toHaveBeenCalledTimes(2);
    const command =
      commandBus.execute.mock.calls[0][0] as MarkPodMembershipPaidCommand;
    expect(command.podId).toBe('pod-1');
  });
});
