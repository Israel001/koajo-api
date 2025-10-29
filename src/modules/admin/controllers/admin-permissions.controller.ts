import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminJwtGuard, AdminAuthenticatedRequest, AuthenticatedAdmin } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import { ADMIN_PERMISSION_MANAGE_PERMISSIONS } from '../admin-permission.constants';
import { ListAdminPermissionsQuery } from '../queries/list-admin-permissions.query';
import type { AdminPermissionSummary } from '../contracts/admin-results';
import { AdminPermissionSummaryDto } from '../contracts/admin-swagger.dto';
import { CreateAdminPermissionDto } from '../dto/create-admin-permission.dto';
import { CreateAdminPermissionCommand } from '../commands/create-admin-permission.command';

@ApiTags('admin-permissions')
@Controller({ path: 'admin/permissions', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminPermissionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List available admin permissions' })
  @ApiOkResponse({ type: [AdminPermissionSummaryDto], description: 'List of permissions.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_PERMISSIONS)
  async list(): Promise<AdminPermissionSummary[]> {
    return this.queryBus.execute(new ListAdminPermissionsQuery());
  }

  @Post()
  @ApiOperation({ summary: 'Register a new admin permission code' })
  @ApiCreatedResponse({ type: AdminPermissionSummaryDto, description: 'Admin permission created.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_PERMISSIONS)
  async create(
    @Body() payload: CreateAdminPermissionDto,
    @Req() req: Request,
  ): Promise<AdminPermissionSummary> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new CreateAdminPermissionCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        {
          code: payload.code,
          name: payload.name ?? null,
          description: payload.description ?? null,
        },
      ),
    );
  }
}
