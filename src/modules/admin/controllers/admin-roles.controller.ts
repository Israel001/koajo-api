import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards, Req } from '@nestjs/common';
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
import { UpdateAdminRoleDto } from '../dto/update-admin-role.dto';
import { UpdateAdminRoleCommand } from '../commands/update-admin-role.command';
import { DeleteAdminRoleCommand } from '../commands/delete-admin-role.command';
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

  @Patch(':roleId')
  @ApiOperation({ summary: 'Update the name or description of a role' })
  @ApiOkResponse({ type: AdminRoleSummaryDto, description: 'Updated admin role.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_ROLES)
  async update(
    @Param('roleId') roleId: string,
    @Body() payload: UpdateAdminRoleDto,
  ): Promise<AdminRoleSummary> {
    return this.commandBus.execute(
      new UpdateAdminRoleCommand(
        roleId,
        payload.name ?? null,
        typeof payload.description === 'undefined'
          ? null
          : payload.description ?? null,
      ),
    );
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete a role if it is not assigned to any user' })
  @ApiOkResponse({
    description: 'Role deleted.',
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean' } },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_ROLES)
  async delete(@Param('roleId') roleId: string): Promise<{ deleted: boolean }> {
    return this.commandBus.execute(new DeleteAdminRoleCommand(roleId));
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
