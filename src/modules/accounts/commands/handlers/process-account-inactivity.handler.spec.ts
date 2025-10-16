import { EntityRepository } from '@mikro-orm/mysql';
import { ProcessAccountInactivityHandler } from './process-account-inactivity.handler';
import { ProcessAccountInactivityCommand } from '../process-account-inactivity.command';
import { AccountEntity } from '../../entities/account.entity';

describe('ProcessAccountInactivityHandler', () => {
  const createAccount = (lastActivityMsAgo: number): AccountEntity => {
    const email = 'user@example.com';
    const account = new AccountEntity({
      email,
      phoneNumber: '+11111111111',
      passwordHash: 'hash',
    });
    const reference = new Date(Date.now() - lastActivityMsAgo);
    account.createdAt = reference;
    account.lastPodJoinedAt = reference;
    account.checksum = 'checksum';
    return account;
  };

  const buildHandler = (accounts: AccountEntity[]) => {
    const find = jest.fn().mockResolvedValue(accounts);
    const persist = jest.fn();
    const flush = jest.fn();
    const getEntityManager = jest.fn(() => ({ persist, flush }));

    const repository = {
      find,
      getEntityManager,
    } as unknown as EntityRepository<AccountEntity>;

    const mailService = {
      sendAccountInactivityReminder: jest.fn().mockResolvedValue(undefined),
      sendAccountClosureNotice: jest.fn().mockResolvedValue(undefined),
    };

    const checksumService = {
      generate: jest.fn().mockReturnValue('next-checksum'),
    };

    const handler = new ProcessAccountInactivityHandler(
      repository,
      mailService as any,
      checksumService as any,
    );

    return {
      handler,
      find,
      persist,
      flush,
      mailService,
      checksumService,
    };
  };

  it('sends 60-day inactivity reminder and records timestamp', async () => {
    const sixtyOneDaysMs = 61 * 24 * 60 * 60 * 1000;
    const account = createAccount(sixtyOneDaysMs);

    const { handler, mailService, persist, flush, checksumService } = buildHandler([
      account,
    ]);

    const reference = new Date();
    await handler.execute(new ProcessAccountInactivityCommand(reference));

    expect(mailService.sendAccountInactivityReminder).toHaveBeenCalledWith(
      account.email,
    );
    expect(account.inactivityWarningSentAt).toBe(reference);
    expect(checksumService.generate).toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(account);
    expect(flush).toHaveBeenCalled();
  });

  it('sends 90-day closure notice and deactivates account', async () => {
    const ninetyFiveDaysMs = 95 * 24 * 60 * 60 * 1000;
    const account = createAccount(ninetyFiveDaysMs);
    account.isActive = true;

    const { handler, mailService, persist, flush } = buildHandler([account]);

    const reference = new Date();
    await handler.execute(new ProcessAccountInactivityCommand(reference));

    expect(mailService.sendAccountClosureNotice).toHaveBeenCalledWith(
      account.email,
      reference,
    );
    expect(account.inactivityClosureSentAt).toBe(reference);
    expect(account.isActive).toBe(false);
    expect(persist).toHaveBeenCalledWith(account);
    expect(flush).toHaveBeenCalled();
  });
});
