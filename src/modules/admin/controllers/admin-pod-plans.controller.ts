import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import type {
  AdminAuthenticatedRequest,
  AuthenticatedAdmin,
} from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { CreatePodPlanDto } from '../dto/create-pod-plan.dto';
import { UpdatePodPlanDto } from '../dto/update-pod-plan.dto';
import { ListAdminPodPlansQuery } from '../queries/list-admin-pod-plans.query';
import type {
  AdminPodPlanSummary,
  AdminPodPlansListResult,
} from '../contracts/admin-results';
import {
  AdminPodPlanSummaryDto,
  AdminPodPlansListResultDto,
} from '../contracts/admin-swagger.dto';
import { CreateAdminPodPlanCommand } from '../commands/create-admin-pod-plan.command';
import { UpdateAdminPodPlanCommand } from '../commands/update-admin-pod-plan.command';
import { DeleteAdminPodPlanCommand } from '../commands/delete-admin-pod-plan.command';
import {
  ADMIN_PERMISSION_REFRESH_POD_PLANS,
  ADMIN_PERMISSION_VIEW_POD_PLANS,
} from '../admin-permission.constants';

@ApiTags('admin-pod-plans')
@Controller({ path: 'admin/pod-plans', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminPodPlansController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List pod plans' })
  @ApiOkResponse({
    description: 'Pod plans fetched.',
    type: AdminPodPlansListResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_POD_PLANS)
  async list(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminPodPlansListResult> {
    return this.queryBus.execute(
      new ListAdminPodPlansQuery(query.limit, query.offset, query.search),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new pod plan (super admin only)' })
  @ApiCreatedResponse({
    description: 'Pod plan created.',
    type: AdminPodPlanSummaryDto,
  })
  @ApiConflictResponse({ description: 'Duplicate pod plan code.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_REFRESH_POD_PLANS)
  async create(
    @Body() payload: CreatePodPlanDto,
    @Req() req: Request,
  ): Promise<AdminPodPlanSummary> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new CreateAdminPodPlanCommand(
        {
          adminId: requester.adminId,
          role: requester.role,
          isSuperAdmin: requester.isSuperAdmin,
        },
        payload,
      ),
    );
  }

  @Patch(':planId')
  @ApiOperation({ summary: 'Update an existing pod plan (super admin only)' })
  @ApiOkResponse({
    description: 'Pod plan updated.',
    type: AdminPodPlanSummaryDto,
  })
  @ApiConflictResponse({
    description:
      'The plan cannot be modified because it is used by pods with real members.',
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_REFRESH_POD_PLANS)
  async update(
    @Param('planId') planId: string,
    @Body() payload: UpdatePodPlanDto,
    @Req() req: Request,
  ): Promise<AdminPodPlanSummary> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    return this.commandBus.execute(
      new UpdateAdminPodPlanCommand(
        {
          adminId: requester.adminId,
          role: requester.role,
          isSuperAdmin: requester.isSuperAdmin,
        },
        planId,
        payload,
      ),
    );
  }

  @Delete(':planId')
  @ApiOperation({ summary: 'Delete a pod plan (super admin only)' })
  @ApiNoContentResponse({ description: 'Pod plan deleted.' })
  @ApiConflictResponse({
    description:
      'The plan cannot be deleted because it is used by pods with real members.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAdminPermissions(ADMIN_PERMISSION_REFRESH_POD_PLANS)
  async delete(
    @Param('planId') planId: string,
    @Req() req: Request,
  ): Promise<void> {
    const requester: AuthenticatedAdmin = (req as AdminAuthenticatedRequest).admin;

    await this.commandBus.execute(
      new DeleteAdminPodPlanCommand(
        {
          adminId: requester.adminId,
          role: requester.role,
          isSuperAdmin: requester.isSuperAdmin,
        },
        planId,
      ),
    );
  }
}
