import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MailService } from '../../../common/notification/mail.service';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import {
  AdminPermissionsGuard,
  RequireAdminPermissions,
} from '../guards/admin-permissions.guard';
import { ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS } from '../admin-permission.constants';
import {
  MANUAL_EMAIL_TEMPLATE_MAP,
  MANUAL_EMAIL_TEMPLATES,
} from '../constants/manual-email-templates.constant';
import { SendManualEmailDto } from '../dto/manual-email.dto';
import { AdminActivityService } from '../services/admin-activity.service';
import { AdminActivityAction } from '../admin-activity-action.enum';
import type { Request } from 'express';
import type { AdminAuthenticatedRequest } from '../guards/admin-jwt.guard';

@ApiTags('admin-manual-emails')
@Controller({ path: 'admin/email-templates/manual', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
export class AdminManualEmailsController {
  constructor(
    private readonly mailService: MailService,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List manual email templates that can be triggered by admins',
  })
  @ApiOkResponse({
    description: 'Manual templates fetched.',
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS)
  listManualTemplates() {
    return MANUAL_EMAIL_TEMPLATES;
  }

  @Post('send')
  @ApiOperation({
    summary: 'Send a manual email template to one or more recipients',
  })
  @ApiOkResponse({
    description: 'Email template dispatched.',
    schema: {
      type: 'object',
      properties: {
        templateCode: { type: 'string' },
        requested: { type: 'number', example: 1 },
        sent: { type: 'number', example: 1 },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS)
  async sendManualTemplate(
    @Body() payload: SendManualEmailDto,
    @Req() req: Request,
  ): Promise<{ templateCode: string; requested: number; sent: number }> {
    const admin = (req as AdminAuthenticatedRequest).admin;
    const template = MANUAL_EMAIL_TEMPLATE_MAP.get(payload.templateCode);
    if (!template) {
      throw new BadRequestException('Unsupported manual email template.');
    }

    const sanitizedRecipients = payload.recipients.map((recipient, index) => {
      const email = recipient.email.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException(
          `Recipient email at position ${index + 1} is empty.`,
        );
      }

      const variables = this.normalizeVariables(recipient.variables ?? {});
      for (const variable of template.variables) {
        const value = variables[variable.key];
        if (
          variable.required &&
          (value === undefined ||
            value === null ||
            (typeof value === 'string' && !value.trim().length))
        ) {
          throw new BadRequestException(
            `Missing required variable "${variable.key}" for recipient at position ${index + 1}.`,
          );
        }
      }

      return {
        email,
        variables,
      };
    });

    const subject =
      (payload.subject?.trim().length ? payload.subject.trim() : null) ??
      template.subject;

    const sent = await this.mailService.sendManualTemplateEmail({
      templateCode: template.code,
      subject,
      recipients: sanitizedRecipients,
      reason: `manual:${template.code}`,
    });

    await this.adminActivityService.record(
      AdminActivityAction.SEND_MANUAL_EMAIL,
      admin.adminId,
      {
        templateCode: template.code,
        subject,
        recipients: sanitizedRecipients.map((recipient) => recipient.email),
        requested: sanitizedRecipients.length,
        sent,
      },
    );

    return {
      templateCode: template.code,
      requested: sanitizedRecipients.length,
      sent,
    };
  }

  private normalizeVariables(
    variables: Record<string, string | number>,
  ): Record<string, string | number> {
    const normalized: Record<string, string | number> = { ...variables };

    if (variables.reasons && typeof variables.reasons === 'string') {
      const items = variables.reasons
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length);
      if (items.length) {
        normalized.reasons = items.map((item) => `<li>${item}</li>`).join('');
      }
    }

    return normalized;
  }
}
