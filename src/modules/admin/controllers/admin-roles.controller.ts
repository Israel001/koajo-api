import { Body, Controller, Get, Param, Post, Put, UseGuards, Req } from '@nestjs/common';
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
import { CreateAdminRoleDto } from '../dto/create-admin-role.dto';
import { CreateAdminRoleCommand } from '../commands/create-admin-role.command';
import { ListAdminRolesQuery } from '../queries/list-admin-roles.query';
import { SetRolePermissionsDto } from '../dto/set-role-permissions.dto';
import { SetAdminRolePermissionsCommand } from '../commands/set-admin-role-permissions.command';
import type { AdminRoleSummary } from '../contracts/admin-results';
import { AdminRoleSummaryDto } from '../contracts/admin-swagger.dto';
import { ADMIN_PERMISSION_EDIT_ROLES } from '../admin-permission.constants';

@ApiTags('admin-roles')
@Controller({ path: 'admin/roles', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminRolesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all admin roles' })
  @ApiOkResponse({ type: [AdminRoleSummaryDto], description: 'List of admin roles.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_ROLES)
  async list(): Promise<AdminRoleSummary[]> {
    return this.queryBus.execute(new ListAdminRolesQuery());
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin role' })
  @ApiCreatedResponse({ type: AdminRoleSummaryDto, description: 'Admin role created.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_ROLES)
  async create(
    @Body() payload: CreateAdminRoleDto,
    @Req() req: Request,
  ): Promise<AdminRoleSummary> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new CreateAdminRoleCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        {
          name: payload.name,
          description: payload.description ?? null,
          permissionCodes: payload.permissionCodes,
        },
      ),
    );
  }

  @Put(':roleId/permissions')
  @ApiOperation({ summary: 'Replace the permissions assigned to a role' })
  @ApiOkResponse({ type: AdminRoleSummaryDto, description: 'Updated admin role.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_ROLES)
  async setPermissions(
    @Param('roleId') roleId: string,
    @Body() payload: SetRolePermissionsDto,
    @Req() req: Request,
  ): Promise<AdminRoleSummary> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new SetAdminRolePermissionsCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        roleId,
        payload.permissionCodes,
      ),
    );
  }
}
