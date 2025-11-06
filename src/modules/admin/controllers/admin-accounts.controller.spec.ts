import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AdminAccountsController } from './admin-accounts.controller';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { ListAllAdminAccountsQuery } from '../queries/list-all-admin-accounts.query';
import { GetAdminAccountQuery } from '../queries/get-admin-account.query';
import { UpdateNotificationPreferencesCommand } from '../../accounts/commands/update-notification-preferences.command';

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
});
