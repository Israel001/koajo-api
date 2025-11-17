import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminPodsQueryDto } from '../dto/pods-query.dto';
import { AdminPodActivityQueryDto } from '../dto/pod-activity-query.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import { ADMIN_PERMISSION_VIEW_PODS } from '../admin-permission.constants';
import {
  AdminPodDetail,
  AdminPodsListResult,
  AdminPodActivity,
  AdminPodStatistics,
} from '../contracts/admin-results';
import { ListAdminPodsQuery } from '../queries/list-admin-pods.query';
import { GetAdminPodQuery } from '../queries/get-admin-pod.query';
import { ListAdminPodActivitiesQuery } from '../queries/list-admin-pod-activities.query';
import { AdminPodActivityDto, AdminPodStatisticsDto } from '../contracts/admin-swagger.dto';
import { GetAdminPodStatsQuery } from '../queries/get-admin-pod-stats.query';
import { MarkPodPayoutDto } from '../dto/mark-pod-payout.dto';
import { MarkPodMembershipPaidCommand } from '../../pods/commands/mark-pod-membership-paid.command';

@ApiTags('admin-pods')
@Controller({ path: 'admin/pods', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminPodsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Retrieve aggregated pod statistics' })
  @ApiOkResponse({
    description: 'Pod statistics fetched.',
    type: AdminPodStatisticsDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async stats(): Promise<AdminPodStatistics> {
    return this.queryBus.execute(new GetAdminPodStatsQuery());
  }

  @Get()
  @ApiOperation({ summary: 'List pods' })
  @ApiOkResponse({ description: 'Pods fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async list(@Query() query: AdminPodsQueryDto): Promise<AdminPodsListResult> {
    return this.queryBus.execute(
      new ListAdminPodsQuery(
        query.limit,
        query.offset,
        query.search ?? null,
        query.status ?? null,
      ),
    );
  }

  @Get(':podId')
  @ApiOperation({ summary: 'Get pod details' })
  @ApiOkResponse({ description: 'Pod fetched.' })
  @ApiNotFoundResponse({ description: 'Pod not found.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async getOne(@Param('podId') podId: string): Promise<AdminPodDetail> {
    return this.queryBus.execute(new GetAdminPodQuery(podId));
  }

  @Get(':podId/activities')
  @ApiOperation({ summary: 'List activities recorded for a pod' })
  @ApiOkResponse({
    description: 'Pod activities fetched.',
    type: [AdminPodActivityDto],
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listActivities(
    @Param('podId') podId: string,
    @Query() query: AdminPodActivityQueryDto,
  ): Promise<AdminPodActivity[]> {
    const limit = query.limit ?? 50;
    return this.queryBus.execute(
      new ListAdminPodActivitiesQuery(podId, limit),
    );
  }

  @Post(':podId/payouts')
  @ApiOperation({ summary: 'Mark a pod membership as paid out' })
  @ApiOkResponse({
    description: 'Payout recorded for the member.',
    schema: {
      type: 'object',
      properties: {
        membershipId: { type: 'string' },
        podId: { type: 'string' },
        payoutAmount: { type: 'string' },
        payoutDate: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async markPayout(
    @Param('podId') podId: string,
    @Body() payload: MarkPodPayoutDto,
  ): Promise<{
    membershipId: string;
    podId: string;
    payoutAmount: string | null;
    payoutDate: string | null;
  }> {
    const membership = await this.commandBus.execute(
      new MarkPodMembershipPaidCommand(
        podId,
        payload.membershipId,
        payload.amount,
        new Date(),
      ),
    );

    return {
      membershipId: membership.id,
      podId: membership.pod.id,
      payoutAmount: membership.payoutAmount ?? null,
      payoutDate: membership.payoutDate
        ? membership.payoutDate.toISOString()
        : null,
    };
  }
}
