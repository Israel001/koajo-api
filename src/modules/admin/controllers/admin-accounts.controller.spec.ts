import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminAccountsController } from './admin-accounts.controller';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { ListAllAdminAccountsQuery } from '../queries/list-all-admin-accounts.query';
import { GetAdminAccountQuery } from '../queries/get-admin-account.query';
import { UpdateNotificationPreferencesCommand } from '../../accounts/commands/update-notification-preferences.command';
import { UpdateAccountFlagsCommand } from '../../accounts/commands/update-account-flags.command';
import { RemoveAccountBankCommand } from '../../accounts/commands/remove-account-bank.command';
import { ListAccountPodsQuery } from '../../pods/queries/list-account-pods.query';
import { PodStatus } from '../../pods/pod-status.enum';
import { PodType } from '../../pods/pod-type.enum';
import { PodGoalType } from '../../pods/pod-goal.enum';

describe('AdminAccountsController', () => {
  let controller: AdminAccountsController;
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
      controllers: [AdminAccountsController],
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

    controller = module.get<AdminAccountsController>(AdminAccountsController);
  });

  it('lists accounts with pagination', async () => {
    queryBus.execute.mockResolvedValue({ total: 0, items: [] });

    await controller.list({ limit: 10, offset: 0 } as any);

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListAdminAccountsQuery));
  });

  it('lists all accounts without pagination', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.listAll();

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListAllAdminAccountsQuery));
  });

  it('fetches account by id', async () => {
    queryBus.execute.mockResolvedValue({ id: 'acc-1' });

    await controller.getOne('acc-1');

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetAdminAccountQuery));
  });

  it('updates notification preferences', async () => {
    commandBus.execute.mockResolvedValue({
      emailNotificationsEnabled: true,
      transactionNotificationsEnabled: false,
    });

    await controller.updateNotifications('acc-1', {
      emailNotificationsEnabled: true,
      transactionNotificationsEnabled: false,
    } as any);

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateNotificationPreferencesCommand),
    );
  });

  it('updates account flags', async () => {
    commandBus.execute.mockResolvedValue({
      requiresFraudReview: false,
      missedPaymentFlag: true,
    });

    const result = await controller.updateFlags('acc-1', {
      fraudReview: false,
    } as any);

    expect(result).toEqual({ fraudReview: false, missedPayment: true });
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateAccountFlagsCommand),
    );
  });

  it('removes bank account connection', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.removeBankAccount('acc-1');

    expect(result).toEqual({ removed: true });
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(RemoveAccountBankCommand),
    );
  });

  it('lists verification attempts with pagination', async () => {
    const expected = { total: 0, items: [] };
    queryBus.execute.mockResolvedValue(expected);

    const result = await controller.listVerifications({
      limit: 25,
      offset: 0,
    } as any);

    expect(result).toBe(expected);
    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAccountVerificationAttemptsQuery),
    );
  });

  it('lists current pods for an account', async () => {
    const membership = buildMembership(PodStatus.ACTIVE);
    queryBus.execute.mockResolvedValue([membership]);

    const result = await controller.currentPods('acc-1');

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAccountPodsQuery),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      podId: membership.pod.id,
      status: PodStatus.ACTIVE,
      totalContributed: membership.totalContributed,
    });
  });

  it('lists pod history for an account', async () => {
    const archived = buildMembership(PodStatus.COMPLETED);
    const current = buildMembership(PodStatus.ACTIVE);
    queryBus.execute.mockResolvedValue([archived, current]);

    const result = await controller.podHistory('acc-1');

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAccountPodsQuery),
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(PodStatus.COMPLETED);
    expect(result[0].completedAt).toBe(archived.pod.completedAt?.toISOString());
  });
});

const buildMembership = (status: PodStatus) =>
  ({
    id: `membership-${status}`,
    joinOrder: 1,
    finalOrder: null,
    payoutDate: null,
    paidOut: false,
    joinedAt: new Date('2025-01-01T00:00:00.000Z'),
    totalContributed: '150.00',
    goalType: PodGoalType.SAVINGS,
    goalNote: null,
    pod: {
      id: `pod-${status}`,
      planCode: '100-12',
      name: 'Test Pod',
      amount: 100,
      lifecycleWeeks: 12,
      maxMembers: 6,
      status,
      type: PodType.SYSTEM,
      cadence: null,
      completedAt:
        status === PodStatus.COMPLETED
          ? new Date('2025-05-01T00:00:00.000Z')
          : null,
    },
  }) as any;
