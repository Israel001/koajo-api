import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateAdminAnnouncementHandler } from './create-admin-announcement.handler';
import { CreateAdminAnnouncementCommand } from '../create-admin-announcement.command';
import { AnnouncementChannel } from '../../announcement-channel.enum';
import { AnnouncementSeverity } from '../../announcement-severity.enum';

const buildCommand = (overrides: Partial<CreateAdminAnnouncementCommand> = {}): CreateAdminAnnouncementCommand => {
  const adminId =
    overrides.adminId !== undefined ? overrides.adminId : 'admin-1';
  const sendToAll =
    overrides.sendToAll !== undefined ? overrides.sendToAll : false;
  return new CreateAdminAnnouncementCommand(
    adminId as any,
    overrides.channel ?? AnnouncementChannel.EMAIL,
    overrides.name ?? ' Feature Launch ',
    overrides.notificationTitle ?? ' New Features ',
    overrides.message ?? ' Check out the latest updates. ',
    overrides.severity ?? AnnouncementSeverity.INFO,
    sendToAll,
    overrides.accountIds ?? ['acc-1'],
    overrides.actionUrl ?? null,
    overrides.imageUrl ?? null,
  );
};

describe('CreateAdminAnnouncementHandler', () => {
  let handler: CreateAdminAnnouncementHandler;
  let announcementRepository: {
    create: jest.Mock;
    getEntityManager: jest.Mock;
  };
  let announcementRecipientRepository: {
    create: jest.Mock;
  };
  let accountRepository: {
    find: jest.Mock;
    findAll: jest.Mock;
  };
  let adminRepository: {
    findOne: jest.Mock;
  };
  let mailService: {
    sendAnnouncementEmail: jest.Mock;
  };
  let inAppNotificationService: {
    createMany: jest.Mock;
  };
  let entityManager: {
    persist: jest.Mock;
    flush: jest.Mock;
  };

  beforeEach(() => {
    entityManager = {
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    announcementRepository = {
      create: jest.fn(),
      getEntityManager: jest.fn(() => entityManager),
    } as any;

    announcementRecipientRepository = {
      create: jest.fn(),
    } as any;

    accountRepository = {
      find: jest.fn(),
      findAll: jest.fn(),
    } as any;

    adminRepository = {
      findOne: jest.fn(),
    } as any;

    mailService = {
      sendAnnouncementEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    inAppNotificationService = {
      createMany: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new CreateAdminAnnouncementHandler(
      announcementRepository as any,
      announcementRecipientRepository as any,
      accountRepository as any,
      adminRepository as any,
      mailService as any,
      inAppNotificationService as any,
    );
  });

  it('throws when admin is not found', async () => {
    adminRepository.findOne.mockResolvedValue(null);

    await expect(handler.execute(buildCommand())).rejects.toBeInstanceOf(NotFoundException);
    expect(announcementRepository.create).not.toHaveBeenCalled();
  });

  it('creates email announcement for selected accounts', async () => {
    const admin = { id: 'admin-1' };
    const account = {
      id: 'acc-1',
      email: 'user@example.com',
      firstName: 'Jane',
    } as any;

    adminRepository.findOne.mockResolvedValue(admin);
    accountRepository.find.mockResolvedValue([account]);

    const createdAt = new Date();
    announcementRepository.create.mockImplementation((payload) => ({
      id: 'announcement-1',
      createdAt,
      ...payload,
    }));

    const command = buildCommand();

    const result = await handler.execute(command);

    const createPayload = announcementRepository.create.mock.calls[0][0];
    expect(createPayload).toMatchObject({
      name: 'Feature Launch',
      message: 'Check out the latest updates.',
      notificationTitle: 'New Features',
      sendToAll: false,
    });

    expect(accountRepository.find).toHaveBeenCalledWith({ id: { $in: ['acc-1'] } });
    expect(announcementRecipientRepository.create).toHaveBeenCalledTimes(1);
    expect(entityManager.persist).toHaveBeenCalled();
    expect(entityManager.flush).toHaveBeenCalledTimes(1);
    expect(mailService.sendAnnouncementEmail).toHaveBeenCalledTimes(1);
    expect(inAppNotificationService.createMany).toHaveBeenCalledTimes(1);

    const notifications = inAppNotificationService.createMany.mock.calls[0][0];
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      account,
      title: 'New Features',
      severity: AnnouncementSeverity.INFO,
    });

    const mailCallArgs = mailService.sendAnnouncementEmail.mock.calls[0][0];
    expect(mailCallArgs.account).toBe(account);
    expect(mailCallArgs.announcementName).toBe('Feature Launch');
    expect(mailCallArgs.message).toBe('Check out the latest updates.');

    expect(result).toMatchObject({
      id: 'announcement-1',
      name: 'Feature Launch',
      channel: AnnouncementChannel.EMAIL,
      severity: AnnouncementSeverity.INFO,
      notificationTitle: 'New Features',
      sendToAll: false,
      totalRecipients: 1,
    });
  });

  it('allows announcements without a persisted admin record', async () => {
    const account = {
      id: 'acc-1',
      email: 'anon@example.com',
      firstName: 'Anon',
    } as any;

    accountRepository.find.mockResolvedValue([account]);
    // Ensure we can introspect payload created.
    announcementRepository.create.mockImplementation((payload) => ({
      id: 'announcement-3',
      createdAt: new Date(),
      ...payload,
    }));

    const command = buildCommand({ adminId: null as any });

    await handler.execute(command);

    expect(adminRepository.findOne).not.toHaveBeenCalled();

    const createPayload = announcementRepository.create.mock.calls[0][0];
    expect(createPayload.createdBy).toBeNull();
  });

  it('creates in-app announcement for all users without duplicating recipients', async () => {
    const admin = { id: 'admin-1' };
    const accounts = [
      {
        id: 'acc-1',
        email: 'user1@example.com',
        firstName: 'Alice',
      },
      {
        id: 'acc-2',
        email: 'user2@example.com',
        firstName: 'Bob',
      },
    ] as any[];

    adminRepository.findOne.mockResolvedValue(admin);
    accountRepository.findAll.mockResolvedValue(accounts);

    const createdAt = new Date();
    announcementRepository.create.mockImplementation((payload) => ({
      id: 'announcement-2',
      createdAt,
      ...payload,
    }));

    const command = buildCommand({
      channel: AnnouncementChannel.IN_APP,
      severity: AnnouncementSeverity.WARNING,
      sendToAll: true,
      accountIds: null,
      message: ' Please review the updates. ',
    });

    const result = await handler.execute(command);

    const createPayload = announcementRepository.create.mock.calls[0][0];
    expect(createPayload).toMatchObject({
      name: 'Feature Launch',
      notificationTitle: 'New Features',
      sendToAll: true,
    });

    expect(accountRepository.findAll).toHaveBeenCalled();
    expect(announcementRecipientRepository.create).not.toHaveBeenCalled();
    expect(mailService.sendAnnouncementEmail).not.toHaveBeenCalled();
    expect(inAppNotificationService.createMany).toHaveBeenCalledTimes(1);

    const notifications = inAppNotificationService.createMany.mock.calls[0][0];
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({
      account: accounts[0],
      title: 'New Features',
      severity: AnnouncementSeverity.WARNING,
    });
    expect(notifications[0].body.startsWith('Hi Alice')).toBe(true);

    expect(result).toMatchObject({
      id: 'announcement-2',
      sendToAll: true,
      totalRecipients: 2,
      channel: AnnouncementChannel.IN_APP,
      severity: AnnouncementSeverity.WARNING,
    });
  });

  it('validates message and recipients when sendToAll is false', async () => {
    const admin = { id: 'admin-1' };
    adminRepository.findOne.mockResolvedValue(admin);

    await expect(
      handler.execute(
        buildCommand({
          message: '   ',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      handler.execute(
        buildCommand({
          message: 'Valid',
          accountIds: [],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
