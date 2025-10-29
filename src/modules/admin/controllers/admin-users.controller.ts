import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import type { AdminAuthenticatedRequest, AuthenticatedAdmin } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import type { Request } from 'express';
import { CreateAdminUserDto } from '../dto/create-admin-user.dto';
import { CreateAdminUserCommand } from '../commands/create-admin-user.command';
import type {
  CreateAdminUserResult,
  AdminUserDto,
} from '../contracts/admin-results';
import {
  CreateAdminUserResultDto,
  AdminUserDtoClass,
} from '../contracts/admin-swagger.dto';
import { ListAdminUsersQuery } from '../queries/list-admin-users.query';
import { UpdateAdminUserDto } from '../dto/update-admin-user.dto';
import { UpdateAdminUserProfileCommand } from '../commands/update-admin-user-profile.command';
import { DeleteAdminUserCommand } from '../commands/delete-admin-user.command';
import { SetAdminUserRolesDto } from '../dto/set-admin-user-roles.dto';
import { SetAdminUserRolesCommand } from '../commands/set-admin-user-roles.command';
import { SetAdminUserPermissionsDto } from '../dto/set-admin-user-permissions.dto';
import { SetAdminUserPermissionsCommand } from '../commands/set-admin-user-permissions.command';
import { GetAdminUserQuery } from '../queries/get-admin-user.query';
import { ADMIN_PERMISSION_MANAGE_USERS } from '../admin-permission.constants';

@ApiTags('admin-users')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminUsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List admin users' })
  @ApiOkResponse({ description: 'Admin users list.', type: [AdminUserDtoClass] })
  async list(): Promise<AdminUserDto[]> {
    return this.queryBus.execute(new ListAdminUsersQuery());
  }

  @Get(':adminId')
  @ApiOperation({ summary: 'Retrieve an admin user by identifier' })
  @ApiOkResponse({ description: 'Admin user details.', type: AdminUserDtoClass })
  async get(@Param('adminId') adminId: string): Promise<AdminUserDto> {
    return this.queryBus.execute(new GetAdminUserQuery(adminId));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new admin user (super admin only)' })
  @ApiCreatedResponse({
    description: 'Admin user created.',
    type: CreateAdminUserResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USERS)
  async create(
    @Body() payload: CreateAdminUserDto,
    @Req() req: Request,
  ): Promise<CreateAdminUserResult> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new CreateAdminUserCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        {
          email: payload.email,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          phoneNumber: payload.phoneNumber ?? null,
          roleIds: payload.roleIds,
          allowPermissions: payload.allowPermissions,
          denyPermissions: payload.denyPermissions,
          password: payload.password,
          generatePassword:
            typeof payload.generatePassword === 'boolean'
              ? payload.generatePassword
              : true,
          inviteTemplateCode: payload.inviteTemplateCode,
        },
      ),
    );
  }

  @Patch(':adminId')
  @ApiOperation({ summary: 'Update an admin user profile (super admin only)' })
  @ApiOkResponse({ description: 'Updated admin user.', type: AdminUserDtoClass })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USERS)
  async update(
    @Param('adminId') adminId: string,
    @Body() payload: UpdateAdminUserDto,
    @Req() req: Request,
  ): Promise<AdminUserDto> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new UpdateAdminUserProfileCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        adminId,
        {
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
          email: payload.email ?? null,
          phoneNumber: payload.phoneNumber ?? null,
          isActive: payload.isActive ?? null,
        },
      ),
    );
  }

  @Delete(':adminId')
  @ApiOperation({ summary: 'Remove an admin user (super admin only)' })
  @ApiNoContentResponse({ description: 'Admin user removed.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('adminId') adminId: string,
    @Req() req: Request,
  ): Promise<void> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    await this.commandBus.execute(
      new DeleteAdminUserCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        adminId,
      ),
    );
  }

  @Put(':adminId/roles')
  @ApiOperation({ summary: 'Replace roles assigned to an admin user' })
  @ApiOkResponse({ description: 'Admin user updated.', type: AdminUserDtoClass })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USERS)
  async setRoles(
    @Param('adminId') adminId: string,
    @Body() payload: SetAdminUserRolesDto,
    @Req() req: Request,
  ): Promise<AdminUserDto> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new SetAdminUserRolesCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        adminId,
        payload.roleIds,
      ),
    );
  }

  @Put(':adminId/permissions')
  @ApiOperation({ summary: 'Adjust explicit permission grants for an admin user' })
  @ApiOkResponse({ description: 'Admin user updated.', type: AdminUserDtoClass })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USERS)
  async setPermissions(
    @Param('adminId') adminId: string,
    @Body() payload: SetAdminUserPermissionsDto,
    @Req() req: Request,
  ): Promise<AdminUserDto> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new SetAdminUserPermissionsCommand(
        {
          adminId: requester.adminId,
          isSuperAdmin: requester.isSuperAdmin,
        },
        adminId,
        {
          allow: payload.allow ?? [],
          deny: payload.deny ?? [],
        },
      ),
    );
  }
}
