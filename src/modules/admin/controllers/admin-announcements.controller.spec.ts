import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus } from '@nestjs/cqrs';
import type { Request } from 'express';
import { AdminAnnouncementsController } from './admin-announcements.controller';
import { CreateAdminAnnouncementCommand } from '../commands/create-admin-announcement.command';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

describe('AdminAnnouncementsController', () => {
  let controller: AdminAnnouncementsController;
  let commandBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAnnouncementsController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
      ],
    }).compile();

    controller = module.get<AdminAnnouncementsController>(AdminAnnouncementsController);
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
});
