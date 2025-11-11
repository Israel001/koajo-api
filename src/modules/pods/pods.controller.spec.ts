import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../accounts/guards/jwt-auth.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PodsController } from './pods.controller';
import { PodPlanDto } from './dto/pod-plan.dto';
import { PodStatus } from './pod-status.enum';
import { PodGoalType } from './pod-goal.enum';
import { ListPodPlansQuery } from './queries/list-pod-plans.query';
import { JoinPodCommand } from './commands/join-pod.command';
import { ListAccountPodsQuery } from './queries/list-account-pods.query';
import { CreateCustomPodCommand } from './commands/create-custom-pod.command';
import { AcceptCustomPodInviteCommand } from './commands/accept-custom-pod-invite.command';
import { CustomPodCadence } from './custom-pod-cadence.enum';
import { PodType } from './pod-type.enum';
import { ListPodActivitiesQuery } from './queries/list-pod-activities.query';
import { ListAccountPodActivitiesQuery } from './queries/list-account-pod-activities.query';
import { ListOpenPodsForPlanQuery } from './queries/list-open-pods-for-plan.query';

describe('PodsController', () => {
  let controller: PodsController;
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
      controllers: [PodsController],
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
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PodsController>(PodsController);
  });

  it('returns pod plans', async () => {
    const plans: PodPlanDto[] = [
      {
        code: '100-12',
        amount: 100,
        lifecycleWeeks: 12,
        maxMembers: 6,
        active: true,
      },
    ];
    queryBus.execute.mockResolvedValue(plans);

    await expect(controller.getPlans()).resolves.toEqual(plans);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListPodPlansQuery));
  });

  it('lists open pods for a plan', async () => {
    const pods = [
      {
        id: 'pod-1',
        planCode: '100-12',
        amount: 100,
        lifecycleWeeks: 12,
        maxMembers: 6,
        status: PodStatus.OPEN,
        type: PodType.SYSTEM,
        cadence: null,
        randomizePayoutOrder: false,
        expectedMemberCount: null,
        scheduledStartDate: new Date(),
        startDate: null,
        graceEndsAt: null,
        lockedAt: null,
        memberships: {
          getItems: () => [],
        },
      },
    ] as any[];

    queryBus.execute.mockResolvedValue(pods);

    const result = await controller.listOpenPodsForPlan('100-12');
    expect(result).toHaveLength(1);
    expect(result[0].planCode).toBe('100-12');
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListOpenPodsForPlanQuery),
    );
  });

  it('joins plan and returns membership summary', async () => {
    const membership = {
      pod: {
        id: 'pod-1',
        planCode: '100-12',
        amount: 100,
        lifecycleWeeks: 12,
        maxMembers: 6,
        status: PodStatus.OPEN,
        type: PodType.SYSTEM,
        cadence: null,
        randomizePayoutOrder: false,
        expectedMemberCount: null,
        scheduledStartDate: new Date(),
        startDate: null,
        graceEndsAt: null,
        lockedAt: null,
        nextContributionDate: null,
        nextPayoutDate: null,
        memberships: {
          getItems: () => [],
        },
      },
      finalOrder: null,
      payoutDate: null,
    } as any;

    commandBus.execute.mockResolvedValue(membership);

    const request = {
      user: {
        accountId: 'account-1',
      },
    } as AuthenticatedRequest;

    const result = await controller.joinPlan('100-12', request, {
      goal: PodGoalType.SAVINGS,
    });
    expect(result.planCode).toBe('100-12');
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(JoinPodCommand));
  });

  it('returns memberships for current account', async () => {
    queryBus.execute.mockResolvedValue([]);
    const request = {
      user: { accountId: 'account-1' },
    } as AuthenticatedRequest;

    const results = await controller.myPods(request);
    expect(Array.isArray(results)).toBe(true);
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListAccountPodsQuery));
  });

  it('throws when goal is other without note', async () => {
    const request = {
      user: { accountId: 'account-1' },
    } as AuthenticatedRequest;

    await expect(
      controller.joinPlan('100-12', request, {
        goal: PodGoalType.OTHER,
      }),
    ).rejects.toThrow();
  });

  it('creates a custom pod and returns membership summary', async () => {
    const membership = {
      pod: {
        id: 'pod-custom-1',
        planCode: 'custom-bi-weekly',
        name: 'October Circle',
        amount: 500,
        lifecycleWeeks: 12,
        maxMembers: 6,
        status: PodStatus.PENDING,
        type: PodType.CUSTOM,
        cadence: CustomPodCadence.BI_WEEKLY,
        randomizePayoutOrder: true,
        expectedMemberCount: 6,
        scheduledStartDate: null,
        startDate: null,
        graceEndsAt: null,
        lockedAt: null,
        nextContributionDate: null,
        nextPayoutDate: null,
        memberships: {
          getItems: () => [],
        },
      },
      finalOrder: null,
      payoutDate: null,
      totalContributed: '0.00',
    } as any;

    commandBus.execute.mockResolvedValue(membership);

    const request = {
      user: {
        accountId: 'account-1',
      },
    } as AuthenticatedRequest;

    const payload = {
      name: 'October Circle',
      amount: 500,
      cadence: CustomPodCadence.BI_WEEKLY,
      randomizePositions: true,
      invitees: [
        'friend1@example.com',
        'friend2@example.com',
        'friend3@example.com',
        'friend4@example.com',
        'friend5@example.com',
      ],
      origin: 'https://pods.koajo.test',
    };

    const result = await controller.createCustomPod(request, payload as any);
    expect(result.podType).toBe(PodType.CUSTOM);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateCustomPodCommand),
    );

    const command = commandBus.execute.mock.calls[0][0] as CreateCustomPodCommand;
    expect(command.cadence).toBe(payload.cadence);
    expect(command.inviteEmails).toEqual(payload.invitees);
    expect(command.name).toBe(payload.name);
    expect(command.inviteOrigin).toBe(payload.origin);
  });

  it('accepts a custom pod invite and returns membership summary', async () => {
    const payoutDate = new Date();
    const membership = {
      finalOrder: 2,
      payoutDate,
      totalContributed: '0.00',
      pod: {
        id: 'pod-custom-2',
        planCode: 'custom-monthly',
        amount: 1000,
        lifecycleWeeks: 24,
        maxMembers: 8,
        status: PodStatus.ACTIVE,
        type: PodType.CUSTOM,
        cadence: CustomPodCadence.MONTHLY,
        randomizePayoutOrder: false,
        expectedMemberCount: 8,
        scheduledStartDate: new Date(),
        startDate: new Date(),
        graceEndsAt: null,
        lockedAt: new Date(),
        nextContributionDate: new Date(),
        nextPayoutDate: new Date(),
        memberships: {
          getItems: () => [
            {
              finalOrder: 1,
              payoutDate,
              publicId: 'slot-1',
              account: { id: 'creator-id' },
            },
            {
              finalOrder: 2,
              payoutDate,
              publicId: 'slot-2',
              account: { id: 'account-1' },
            },
          ],
        },
      },
    } as any;

    commandBus.execute.mockResolvedValue(membership);

    const request = {
      user: {
        accountId: 'account-1',
      },
    } as AuthenticatedRequest;

    const dto = { token: 'token-123' };

    const result = await controller.acceptCustomPodInvite(request, dto as any);
    expect(result.payoutOrder).toBe(2);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(AcceptCustomPodInviteCommand),
    );

    const command = commandBus.execute.mock.calls.at(-1)![0] as AcceptCustomPodInviteCommand;
    expect(command.token).toEqual(dto.token);
  });

  it('lists activities across all pods for the authenticated user', async () => {
    queryBus.execute.mockResolvedValue({ total: 0, items: [] });
    const request = {
      user: { accountId: 'account-1' },
    } as AuthenticatedRequest;

    const result = await controller.listAllActivities(request, {
      limit: 20,
      offset: 40,
    } as any);

    expect(result).toEqual({ total: 0, items: [] });
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAccountPodActivitiesQuery),
    );
  });

  it('lists activities for a pod the user belongs to', async () => {
    queryBus.execute.mockResolvedValue({ total: 0, items: [] });
    const request = {
      user: { accountId: 'account-1' },
    } as AuthenticatedRequest;

    const result = await controller.listActivities('pod-1', request, {
      limit: 25,
      offset: 0,
    } as any);

    expect(result).toEqual({ total: 0, items: [] });
    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListPodActivitiesQuery));
  });
});
