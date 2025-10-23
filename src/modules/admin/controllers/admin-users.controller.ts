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
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import type { AdminAuthenticatedRequest, AuthenticatedAdmin } from '../guards/admin-jwt.guard';
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
import { AdminRole } from '../admin-role.enum';
import { ListAdminUsersQuery } from '../queries/list-admin-users.query';

@ApiTags('admin-users')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(AdminJwtGuard)
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

  @Post()
  @ApiOperation({ summary: 'Create a new admin user (super admin only)' })
  @ApiCreatedResponse({
    description: 'Admin user created.',
    type: CreateAdminUserResultDto,
  })
  async create(
    @Body() payload: CreateAdminUserDto,
    @Req() req: Request,
  ): Promise<CreateAdminUserResult> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new CreateAdminUserCommand(
        {
          adminId: requester.adminId,
          role: requester.role,
          isSuperAdmin: requester.isSuperAdmin,
        },
        payload.email,
        payload.password,
        payload.role ?? AdminRole.ADMIN,
      ),
    );
  }
}
