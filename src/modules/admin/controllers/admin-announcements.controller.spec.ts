import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { CreateAdminAnnouncementCommand } from '../commands/create-admin-announcement.command';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';
import { ListAdminAnnouncementsQuery } from '../queries/list-admin-announcements.query';

describe('AdminAnnouncementsController', () => {
  let controller: AdminAnnouncementsController;
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
      controllers: [AdminAnnouncementsController],
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

    controller = module.get<AdminAnnouncementsController>(AdminAnnouncementsController);
  });

  it('lists announcements through the query bus', async () => {
    const dto = { limit: 10, offset: 0, search: 'promo' } as any;
    const expected = { total: 0, items: [] };
    queryBus.execute.mockResolvedValue(expected);

    const result = await controller.list(dto);

    expect(result).toEqual(expected);
    expect(queryBus.execute).toHaveBeenCalledWith(
      new ListAdminAnnouncementsQuery(10, 0, 'promo'),
    );
  });

  it('dispatches CreateAdminAnnouncementCommand', async () => {
    const dto = {
      channel: AnnouncementChannel.EMAIL,
      name: 'October update',
      notificationTitle: 'Important update',
      message: 'We have rolled out new features.',
      severity: AnnouncementSeverity.INFO,
      sendToAll: true,
    };

    const expected = { id: 'announcement-1' } as any;
    commandBus.execute.mockResolvedValue(expected);

    const request = {
      admin: {
        adminId: 'admin-1',
      },
    } as unknown as Request;

    const result = await controller.create(dto as any, request);

    expect(result).toEqual(expected);
    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateAdminAnnouncementCommand));

    const command =
      commandBus.execute.mock.calls[0][0] as CreateAdminAnnouncementCommand;
    expect(command.adminId).toEqual('admin-1');
    expect(command.channel).toEqual(AnnouncementChannel.EMAIL);
    expect(command.sendToAll).toBe(true);
    expect(command.accountIds).toBeNull();
  });

  it('allows super admin requests without a persisted admin id', async () => {
    const dto = {
      channel: AnnouncementChannel.IN_APP,
      name: 'System notice',
      notificationTitle: 'Heads up',
      message: 'Look out for maintenance windows.',
      severity: AnnouncementSeverity.WARNING,
      sendToAll: false,
      accountIds: ['account-1'],
    };

    const expected = { id: 'announcement-2' } as any;
    commandBus.execute.mockResolvedValue(expected);

    const request = {
      admin: {
        adminId: null,
        isSuperAdmin: true,
      },
    } as unknown as Request;

    const result = await controller.create(dto as any, request);

    expect(result).toEqual(expected);

    const command =
      commandBus.execute.mock.calls[0][0] as CreateAdminAnnouncementCommand;
    expect(command.adminId).toBeNull();
    expect(command.accountIds).toEqual(['account-1']);
  });
});
