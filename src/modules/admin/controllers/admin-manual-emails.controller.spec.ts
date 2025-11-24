import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../../../common/notification/mail.service';
import { AdminManualEmailsController } from './admin-manual-emails.controller';
import { SendManualEmailDto } from '../dto/manual-email.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import { AdminActivityService } from '../services/admin-activity.service';
import { AdminActivityAction } from '../admin-activity-action.enum';
import { NotificationTemplateService } from '../../notifications/notification-template.service';

describe('AdminManualEmailsController', () => {
  let controller: AdminManualEmailsController;
  let mailService: { sendManualTemplateEmail: jest.Mock };
  let adminActivityService: { record: jest.Mock };
  let notificationTemplateService: { listAll: jest.Mock };

  beforeEach(async () => {
    mailService = {
      sendManualTemplateEmail: jest.fn(),
    };
    adminActivityService = {
      record: jest.fn(),
    };
    notificationTemplateService = {
      listAll: jest.fn().mockResolvedValue([{ code: 'welcome', body: '<p>Hi</p>' }]),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminManualEmailsController],
      providers: [
        {
          provide: MailService,
          useValue: mailService,
        },
        {
          provide: AdminActivityService,
          useValue: adminActivityService,
        },
        {
          provide: NotificationTemplateService,
          useValue: notificationTemplateService,
        },
      ],
    });

    builder.overrideGuard(AdminJwtGuard).useValue({
      canActivate: jest.fn().mockReturnValue(true),
    });
    builder.overrideGuard(AdminPermissionsGuard).useValue({
      canActivate: jest.fn().mockReturnValue(true),
    });

    const module: TestingModule = await builder.compile();

    controller = module.get<AdminManualEmailsController>(
      AdminManualEmailsController,
    );
  });

  it('returns manual templates list', () => {
    const result = controller.listManualTemplates();
    expect(result).resolves.toEqual([{ code: 'welcome', body: '<p>Hi</p>' }]);
  });

  it('sends manual email with validated payload', async () => {
    mailService.sendManualTemplateEmail.mockResolvedValue(1);
    const dto: SendManualEmailDto = {
      templateCode: 'dispute_acknowledgement',
      recipients: [
        {
          email: 'user@example.com',
          variables: { firstName: 'Koajo' },
        },
      ],
    };

    const result = await controller.sendManualTemplate(dto, adminRequest());
    expect(mailService.sendManualTemplateEmail).toHaveBeenCalledWith({
      templateCode: 'dispute_acknowledgement',
      subject: "We've acknowledged your dispute",
      recipients: [
        {
          email: 'user@example.com',
          variables: { firstName: 'Koajo' },
        },
      ],
      reason: 'manual:dispute_acknowledgement',
    });
    expect(result).toEqual({
      templateCode: 'dispute_acknowledgement',
      requested: 1,
      sent: 1,
    });
    expect(adminActivityService.record).toHaveBeenCalledWith(
      AdminActivityAction.SEND_MANUAL_EMAIL,
      'admin-1',
      expect.objectContaining({
        templateCode: 'dispute_acknowledgement',
        requested: 1,
        sent: 1,
      }),
    );
  });

  it('throws when template code is invalid', async () => {
    const dto: SendManualEmailDto = {
      templateCode: 'unknown',
      recipients: [{ email: 'user@example.com' }],
    };

    await expect(controller.sendManualTemplate(dto, adminRequest())).rejects.toThrow(
      'Unsupported manual email template.',
    );
    expect(mailService.sendManualTemplateEmail).not.toHaveBeenCalled();
    expect(adminActivityService.record).not.toHaveBeenCalled();
  });

  it('throws when required variables are missing', async () => {
    const dto: SendManualEmailDto = {
      templateCode: 'stripe_triggered_dispute',
      recipients: [{ email: 'user@example.com', variables: {} }],
    };

    await expect(controller.sendManualTemplate(dto, adminRequest())).rejects.toThrow(
      /Missing required variable/,
    );
    expect(mailService.sendManualTemplateEmail).not.toHaveBeenCalled();
  });
});

const adminRequest = () =>
  ({
    admin: {
      adminId: 'admin-1',
    },
  }) as any;
