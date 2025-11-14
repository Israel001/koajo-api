import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminAccountsController } from './admin-accounts.controller';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { ListAllAdminAccountsQuery } from '../queries/list-all-admin-accounts.query';
import { GetAdminAccountQuery } from '../queries/get-admin-account.query';
import { UpdateNotificationPreferencesCommand } from '../../accounts/commands/update-notification-preferences.command';
import { UpdateAccountFlagsCommand } from '../../accounts/commands/update-account-flags.command';
import { UpdateAccountStatusCommand } from '../../accounts/commands/update-account-status.command';
import { RemoveAccountBankCommand } from '../../accounts/commands/remove-account-bank.command';
import { ListAccountPodsQuery } from '../../pods/queries/list-account-pods.query';
import { PodStatus } from '../../pods/pod-status.enum';
import { PodType } from '../../pods/pod-type.enum';
import { PodGoalType } from '../../pods/pod-goal.enum';
import { ListAccountVerificationAttemptsQuery } from '../queries/list-account-verification-attempts.query';
import { UpdateUserProfileCommand } from '../../accounts/commands/update-user-profile.command';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';

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

    const moduleBuilder = Test.createTestingModule({
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
    });

    moduleBuilder
      .overrideGuard(AdminJwtGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });
    moduleBuilder
      .overrideGuard(AdminPermissionsGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

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

  it('updates account status', async () => {
    commandBus.execute.mockResolvedValue({
      isActive: false,
    });

    const result = await controller.updateStatus('acc-1', {
      isActive: false,
    } as any);

    expect(result).toEqual({ isActive: false });
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateAccountStatusCommand),
    );
  });

  it('updates profile information for an account', async () => {
    const expected = {
      user: { id: 'acc-1' },
      verification: null,
    };
    commandBus.execute.mockResolvedValue(expected);

    const result = await controller.updateProfile('acc-1', {
      firstName: 'Jane',
    } as any);

    expect(result).toBe(expected);
    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(UpdateUserProfileCommand),
    );
    const command = commandBus.execute.mock.calls[0][0] as UpdateUserProfileCommand;
    expect(command.accountId).toBe('acc-1');
    expect(command.allowLockedProfileUpdate).toBe(true);
  });

  it('updates account flags', async () => {
    commandBus.execute.mockResolvedValue({
      requiresFraudReview: false,
      missedPaymentFlag: true,
      overheatFlag: false,
    });

    const result = await controller.updateFlags('acc-1', {
      fraudReview: false,
      overheat: false,
    } as any);

    expect(result).toEqual({ fraudReview: false, missedPayment: true, overheat: false });
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

  it('lists pods for an account with filters', async () => {
    const archived = buildMembership(PodStatus.COMPLETED);
    const current = buildMembership(PodStatus.ACTIVE);
    queryBus.execute.mockResolvedValue([archived, current]);

    const currentPods = await controller.pods('acc-1', {
      filter: 'current',
    } as any);
    expect(currentPods).toHaveLength(1);
    expect(currentPods[0].status).toBe(PodStatus.ACTIVE);

    const history = await controller.pods('acc-1', {
      filter: 'completed',
    } as any);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe(PodStatus.COMPLETED);

    const all = await controller.pods('acc-1', {
      filter: 'all',
    } as any);
    expect(all).toHaveLength(2);

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListAccountPodsQuery),
    );
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
