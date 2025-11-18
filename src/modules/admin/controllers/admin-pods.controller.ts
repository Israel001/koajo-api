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
  AdminPodInviteListResult,
  AdminAccountsListResult,
  AdminPayoutListResult,
} from '../contracts/admin-results';
import { ListAdminPodsQuery } from '../queries/list-admin-pods.query';
import { GetAdminPodQuery } from '../queries/get-admin-pod.query';
import { ListAdminPodActivitiesQuery } from '../queries/list-admin-pod-activities.query';
import {
  AdminPodActivityDto,
  AdminPodInviteListResultDto,
  AdminPodStatisticsDto,
  AdminPayoutListResultDto,
} from '../contracts/admin-swagger.dto';
import { GetAdminPodStatsQuery } from '../queries/get-admin-pod-stats.query';
import { MarkPodPayoutDto } from '../dto/mark-pod-payout.dto';
import { MarkPodMembershipPaidCommand } from '../../pods/commands/mark-pod-membership-paid.command';
import { ListPendingPodInvitesQuery } from '../queries/list-pending-pod-invites.query';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { PodStatus } from '../../pods/pod-status.enum';
import { AdminPayoutQueryDto } from '../dto/admin-payout-query.dto';
import { ListAdminPayoutsQuery } from '../queries/list-admin-payouts.query';
import { SwapPayoutPositionDto } from '../dto/swap-payout-position.dto';
import { SwapPodPayoutPositionCommand } from '../../pods/commands/swap-pod-payout-position.command';
import { SwapPayoutPositionResultDto } from '../contracts/admin-swagger.dto';
import { TriggerPayoutDto } from '../dto/trigger-payout.dto';
import { InitiatePayoutCommand } from '../../finance/commands/initiate-payout.command';
import { ADMIN_PERMISSION_TRIGGER_PAYOUTS } from '../admin-permission.constants';

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

  @Get('incomplete')
  @ApiOperation({ summary: 'List pods that have not been completed' })
  @ApiOkResponse({ description: 'Incomplete pods fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listIncomplete(
    @Query() query: AdminPodsQueryDto,
  ): Promise<AdminPodsListResult> {
    return this.queryBus.execute(
      new ListAdminPodsQuery(
        query.limit,
        query.offset,
        query.search ?? null,
        null,
        true,
      ),
    );
  }

  @Get('open')
  @ApiOperation({ summary: 'List pods that are currently open' })
  @ApiOkResponse({ description: 'Open pods fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listOpen(
    @Query() query: AdminPodsQueryDto,
  ): Promise<AdminPodsListResult> {
    return this.queryBus.execute(
      new ListAdminPodsQuery(
        query.limit,
        query.offset,
        query.search ?? null,
        PodStatus.OPEN,
      ),
    );
  }

  @Get('pending-invites')
  @ApiOperation({ summary: 'List pending pod invitations' })
  @ApiOkResponse({
    description: 'Pending pod invites fetched.',
    type: AdminPodInviteListResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listPendingInvites(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminPodInviteListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListPendingPodInvitesQuery(limit, offset),
    );
  }

  @Get('members')
  @ApiOperation({ summary: 'List members counted in pod statistics' })
  @ApiOkResponse({
    description: 'Members fetched.',
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listMembers(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminAccountsListResult> {
    return this.queryBus.execute(
      new ListAdminAccountsQuery(query.limit, query.offset, query.search),
    );
  }

  @Get('payouts')
  @ApiOperation({ summary: 'List all payouts with timeframe filters' })
  @ApiOkResponse({
    description: 'Payouts fetched.',
    type: AdminPayoutListResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async listPayouts(
    @Query() query: AdminPayoutQueryDto,
  ): Promise<AdminPayoutListResult> {
    return this.queryBus.execute(
      new ListAdminPayoutsQuery(
        query.limit,
        query.offset,
        query.timeframe ?? null,
      ),
    );
  }

  @Post(':podId/swap-payouts')
  @ApiOperation({ summary: 'Swap payout positions for two members in a custom pod' })
  @ApiOkResponse({
    description: 'Payout positions swapped.',
    type: SwapPayoutPositionResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_PODS)
  async swapPayouts(
    @Param('podId') podId: string,
    @Body() payload: SwapPayoutPositionDto,
  ): Promise<SwapPayoutPositionResultDto> {
    return this.commandBus.execute(
      new SwapPodPayoutPositionCommand(
        podId,
        payload.firstMembershipId,
        payload.secondMembershipId,
      ),
    );
  }

  @Post(':podId/payouts/trigger')
  @ApiOperation({
    summary: 'Manually trigger a payout for a pod member (ignores account flags).',
  })
  @ApiOkResponse({
    description: 'Payout initiated.',
    schema: {
      type: 'object',
      properties: {
        payoutId: { type: 'string' },
        status: { type: 'string' },
        stripeReference: { type: 'string' },
        amount: { type: 'string' },
        fee: { type: 'string' },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_TRIGGER_PAYOUTS)
  async triggerPayout(
    @Param('podId') podId: string,
    @Body() payload: TriggerPayoutDto,
  ): Promise<{
    payoutId: string;
    status: string;
    stripeReference: string;
    amount: string;
    fee: string;
  }> {
    return this.commandBus.execute(
      new InitiatePayoutCommand(payload.membershipId, true, 'admin-trigger'),
    );
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
