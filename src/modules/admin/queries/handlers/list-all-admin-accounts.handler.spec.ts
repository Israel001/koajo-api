import { ListAllAdminAccountsHandler } from './list-all-admin-accounts.handler';
import { ListAllAdminAccountsQuery } from '../list-all-admin-accounts.query';

describe('ListAllAdminAccountsHandler', () => {
  let handler: ListAllAdminAccountsHandler;
  let accountRepository: { findAll: jest.Mock };

  beforeEach(() => {
    accountRepository = {
      findAll: jest.fn(),
    } as any;

    handler = new ListAllAdminAccountsHandler(accountRepository as any);
  });

  it('returns mapped accounts ordered by creation date', async () => {
    const createdAt = new Date('2024-01-01T12:00:00Z');
    const account = {
      id: 'acc-1',
      email: 'member@example.com',
      phoneNumber: '1234567890',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: null,
      createdAt,
      isActive: true,
      emailNotificationsEnabled: true,
      transactionNotificationsEnabled: false,
    } as any;

    accountRepository.findAll.mockResolvedValue([account]);

    const result = await handler.execute(new ListAllAdminAccountsQuery());

    expect(accountRepository.findAll).toHaveBeenCalledWith({
      orderBy: { createdAt: 'DESC' },
    });

    expect(result).toEqual([
      {
        id: 'acc-1',
        email: 'member@example.com',
        phoneNumber: '1234567890',
        firstName: 'Ada',
        lastName: 'Lovelace',
        avatarUrl: null,
        createdAt: createdAt.toISOString(),
        isActive: true,
        emailNotificationsEnabled: true,
        transactionNotificationsEnabled: false,
      },
    ]);
  });
});
