import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import { ADMIN_PERMISSION_MANAGE_PERMISSIONS } from '../admin-permission.constants';
import { ListAdminPermissionsQuery } from '../queries/list-admin-permissions.query';
import type { AdminPermissionSummary } from '../contracts/admin-results';
import { AdminPermissionSummaryDto } from '../contracts/admin-swagger.dto';

@ApiTags('admin-permissions')
@Controller({ path: 'admin/permissions', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminPermissionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List available admin permissions' })
  @ApiOkResponse({ type: [AdminPermissionSummaryDto], description: 'List of permissions.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_PERMISSIONS)
  async list(): Promise<AdminPermissionSummary[]> {
    return this.queryBus.execute(new ListAdminPermissionsQuery());
  }

}
