import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminJwtGuard, AdminAuthenticatedRequest } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { CreateAdminAnnouncementCommand } from '../commands/create-admin-announcement.command';
import { AdminAnnouncementResultDto, AdminAnnouncementsListResultDto } from '../contracts/admin-swagger.dto';
import type { AdminAnnouncementResult, AdminAnnouncementsListResult } from '../contracts/admin-results';
import { ADMIN_PERMISSION_CREATE_ANNOUNCEMENTS } from '../admin-permission.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { ListAdminAnnouncementsQuery } from '../queries/list-admin-announcements.query';

@ApiTags('admin-announcements')
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
@Controller({ path: 'admin/announcements', version: '1' })
export class AdminAnnouncementsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List platform announcements' })
  @ApiOkResponse({
    description: 'Announcements fetched.',
    type: AdminAnnouncementsListResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_CREATE_ANNOUNCEMENTS)
  async list(@Query() query: AdminListQueryDto): Promise<AdminAnnouncementsListResult> {
    return this.queryBus.execute(
      new ListAdminAnnouncementsQuery(query.limit, query.offset, query.search),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create and dispatch an announcement' })
  @ApiCreatedResponse({
    description: 'Announcement created and dispatched.',
    type: AdminAnnouncementResultDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid announcement payload supplied.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_CREATE_ANNOUNCEMENTS)
  async create(
    @Body() payload: CreateAnnouncementDto,
    @Req() request: Request,
  ): Promise<AdminAnnouncementResult> {
    const adminRequest = request as AdminAuthenticatedRequest;
    const adminContext = adminRequest.admin;

    if (!adminContext) {
      throw new BadRequestException('Missing admin context.');
    }

    if (!adminContext.adminId && !adminContext.isSuperAdmin) {
      throw new BadRequestException('Missing admin context.');
    }

    const adminId = adminContext.adminId ?? null;

    const accountIds =
      payload.sendToAll || !payload.accountIds
        ? null
        : Array.from(new Set(payload.accountIds));

    return this.commandBus.execute(
      new CreateAdminAnnouncementCommand(
        adminId,
        payload.channel,
        payload.name,
        payload.notificationTitle,
        payload.message,
        payload.severity,
        payload.sendToAll,
        accountIds,
        payload.actionUrl ?? null,
        payload.imageUrl ?? null,
      ),
    );
  }
}
