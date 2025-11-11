import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../accounts/guards/jwt-auth.guard';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PodPlanDto } from './dto/pod-plan.dto';
import { PodMembershipDto } from './dto/pod-membership.dto';
import { CreateCustomPodDto } from './dto/create-custom-pod.dto';
import { AcceptCustomPodInviteDto } from './dto/accept-custom-pod-invite.dto';
import { PodPlanDefinition } from './pod.constants';
import { PodStatus } from './pod-status.enum';
import type { PodWithMembers, MembershipWithPod } from './types';
import { PodGoalType } from './pod-goal.enum';
import { JoinPodDto } from './dto/join-pod.dto';
import { ListPodPlansQuery } from './queries/list-pod-plans.query';
import { ListOpenPodsQuery } from './queries/list-open-pods.query';
import { ListOpenPodsForPlanQuery } from './queries/list-open-pods-for-plan.query';
import { RefreshPodsCommand } from './commands/refresh-pods.command';
import { JoinPodCommand } from './commands/join-pod.command';
import { CreateCustomPodCommand } from './commands/create-custom-pod.command';
import { AcceptCustomPodInviteCommand } from './commands/accept-custom-pod-invite.command';
import { ListAccountPodsQuery } from './queries/list-account-pods.query';
import { PodType } from './pod-type.enum';
import { ListPodActivitiesQuery } from './queries/list-pod-activities.query';
import { ListAccountPodActivitiesQuery } from './queries/list-account-pod-activities.query';
import { PodActivityListResultDto } from './dto/pod-activity.dto';
import { PodActivityQueryDto } from './dto/pod-activity-query.dto';

@ApiTags('pods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'pods', version: '1' })
export class PodsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List pod plans and their lifecycles' })
  @ApiOkResponse({ type: [PodPlanDto] })
  async getPlans(): Promise<PodPlanDefinition[]> {
    return this.queryBus.execute(new ListPodPlansQuery());
  }

  @Get('open')
  @ApiOperation({ summary: 'List pods that are currently open or in grace period' })
  @ApiOkResponse({
    type: [PodMembershipDto],
  })
  async listOpenPods(): Promise<PodMembershipDto[]> {
    const pods = (await this.queryBus.execute(
      new ListOpenPodsQuery(),
    )) as PodWithMembers[];
    return pods.map((pod) => this.toPodSummary(pod, null));
  }

  @Get('plans/:planCode/open')
  @ApiOperation({ summary: 'List open pods for a specific plan' })
  @ApiOkResponse({ type: [PodMembershipDto] })
  async listOpenPodsForPlan(
    @Param('planCode') planCode: string,
  ): Promise<PodMembershipDto[]> {
    const pods = (await this.queryBus.execute(
      new ListOpenPodsForPlanQuery(planCode),
    )) as PodWithMembers[];
    return pods.map((pod) => this.toPodSummary(pod, null));
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a custom pod and invite members' })
  @ApiCreatedResponse({ type: PodMembershipDto })
  @ApiBadRequestResponse({ description: 'Validation failed for payload or business rules.' })
  async createCustomPod(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateCustomPodDto,
  ): Promise<PodMembershipDto> {
    const membership = (await this.commandBus.execute(
      new CreateCustomPodCommand(
        request.user.accountId,
        payload.name,
        payload.amount,
        payload.cadence,
        payload.randomizePositions,
        payload.invitees,
        payload.origin ?? null,
      ),
    )) as MembershipWithPod;

    return this.toMembershipDto(membership, request.user.accountId);
  }

  @Post('custom/invites/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a custom pod invitation' })
  @ApiOkResponse({ type: PodMembershipDto })
  @ApiBadRequestResponse({ description: 'Token invalid or account not eligible.' })
  @ApiNotFoundResponse({ description: 'Invitation not found.' })
  async acceptCustomPodInvite(
    @Req() request: AuthenticatedRequest,
    @Body() payload: AcceptCustomPodInviteDto,
  ): Promise<PodMembershipDto> {
    const membership = (await this.commandBus.execute(
      new AcceptCustomPodInviteCommand(request.user.accountId, payload.token),
    )) as MembershipWithPod;

    return this.toMembershipDto(membership, request.user.accountId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recalculate pod lifecycle states' })
  async refresh(): Promise<{ refreshed: boolean }> {
    await this.commandBus.execute(new RefreshPodsCommand());
    return { refreshed: true };
  }

  @Post('plans/:planCode/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an open pod for the specified plan' })
  @ApiOkResponse({ type: PodMembershipDto })
  async joinPlan(
    @Param('planCode') planCode: string,
    @Req() request: AuthenticatedRequest,
    @Body() payload: JoinPodDto,
  ): Promise<PodMembershipDto> {
    if (
      payload.goal === PodGoalType.OTHER &&
      (!payload.goalNote || !payload.goalNote.trim())
    ) {
      throw new BadRequestException(
        'A goal description is required when selecting other.',
      );
    }

    const membership = (await this.commandBus.execute(
      new JoinPodCommand(request.user.accountId, planCode, payload.goal, payload.goalNote),
    )) as MembershipWithPod;

    return this.toMembershipDto(membership, request.user.accountId);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Retrieve pods associated with the authenticated account' })
  @ApiOkResponse({ type: [PodMembershipDto] })
  async myPods(
    @Req() request: AuthenticatedRequest,
  ): Promise<PodMembershipDto[]> {
    const memberships = (await this.queryBus.execute(
      new ListAccountPodsQuery(request.user.accountId),
    )) as MembershipWithPod[];

    return memberships.map((membership) =>
      this.toMembershipDto(membership, request.user.accountId),
    );
  }

  @Get('activities')
  @ApiOperation({
    summary: 'List recent activities across all pods the user belongs to',
  })
  @ApiOkResponse({ type: PodActivityListResultDto })
  async listAllActivities(
    @Req() request: AuthenticatedRequest,
    @Query() query: PodActivityQueryDto,
  ): Promise<PodActivityListResultDto> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListAccountPodActivitiesQuery(
        request.user.accountId,
        limit,
        offset,
      ),
    );
  }

  @Get(':podId/activities')
  @ApiOperation({ summary: 'List recent activities within a pod the user belongs to' })
  @ApiOkResponse({ type: PodActivityListResultDto })
  async listActivities(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: PodActivityQueryDto,
  ): Promise<PodActivityListResultDto> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListPodActivitiesQuery(
        podId,
        request.user.accountId,
        limit,
        offset,
      ),
    );
  }

  private toPodSummary(
    pod: PodWithMembers,
    accountId: string | null,
  ): PodMembershipDto {
    pod.memberships.getItems();
    const dto = new PodMembershipDto();
    dto.podId = pod.id;
    dto.planCode = pod.planCode;
    dto.name = pod.name ?? null;
    dto.amount = pod.amount;
    dto.lifecycleWeeks = pod.lifecycleWeeks;
    dto.maxMembers = pod.maxMembers;
    dto.status = pod.status;
    dto.podType = pod.type;
    dto.cadence = pod.cadence ?? null;
    dto.randomizePositions =
      pod.type === PodType.CUSTOM ? pod.randomizePayoutOrder : null;
    dto.expectedMemberCount =
      pod.type === PodType.CUSTOM ? pod.expectedMemberCount ?? pod.maxMembers : null;
    dto.scheduledStartDate = pod.scheduledStartDate?.toISOString() ?? null;
    dto.startDate = pod.startDate?.toISOString() ?? null;
    dto.graceEndsAt = pod.graceEndsAt?.toISOString() ?? null;
    dto.lockedAt = pod.lockedAt?.toISOString() ?? null;
    dto.payoutOrder = null;
    dto.payoutDate = null;
    dto.orderedMembers = null;
    dto.aheadOfYou = null;
    dto.behindYou = null;
    dto.goalType = null;
    dto.goalNote = null;
    dto.nextContributionDate = pod.nextContributionDate?.toISOString() ?? null;
    const targetValue = this.calculateContributionTarget(pod);
    dto.totalContributionTarget = targetValue;
    dto.totalContributed = '0.00';
    dto.contributionProgress = 0;
    dto.nextPayoutDate = this.computeNextPayoutDate(pod);

    if (pod.status === PodStatus.ACTIVE || pod.status === PodStatus.COMPLETED) {
      const ordered = pod.memberships
        .getItems()
        .filter((member) => member.finalOrder)
        .sort((a, b) => (a.finalOrder ?? 0) - (b.finalOrder ?? 0));

      dto.orderedMembers = ordered.map((member) => ({
        publicId: member.publicId,
        order: member.finalOrder ?? 0,
        payoutDate: member.payoutDate?.toISOString() ?? null,
        isYou: Boolean(accountId && member.account?.id === accountId),
      }));

      if (accountId) {
        const mySlot = dto.orderedMembers.find((slot) => slot.isYou);
        dto.payoutOrder = mySlot?.order ?? null;
        dto.payoutDate = mySlot?.payoutDate ?? null;
        if (mySlot) {
          dto.aheadOfYou = dto.orderedMembers
            .filter((slot) => slot.order < mySlot.order)
            .map((slot) => ({ ...slot, isYou: slot.isYou }));
          dto.behindYou = dto.orderedMembers
            .filter((slot) => slot.order > mySlot.order)
            .map((slot) => ({ ...slot, isYou: slot.isYou }));
        }
      }
    }

    return dto;
  }

  private toMembershipDto(
    membership: MembershipWithPod,
    accountId: string,
  ): PodMembershipDto {
    membership.pod.memberships.getItems();
    const pod = membership.pod;
    const dto = this.toPodSummary(pod, accountId);

    if (dto.payoutOrder === null && membership.finalOrder) {
      dto.payoutOrder = membership.finalOrder;
      dto.payoutDate = membership.payoutDate?.toISOString() ?? null;
    }

    dto.goalType = membership.goalType;
    dto.goalNote = membership.goalNote ?? null;
    const targetValue = this.calculateContributionTarget(pod);
    dto.totalContributionTarget = targetValue;
    dto.totalContributed = membership.totalContributed ?? '0.00';
    dto.contributionProgress = this.calculateProgress(
      dto.totalContributed,
      targetValue,
    );
    dto.nextPayoutDate = this.computeNextPayoutDate(pod);

    return dto;
  }

  private calculateContributionTarget(pod: PodWithMembers): string {
    if (pod.type === PodType.CUSTOM) {
      const expected = pod.expectedMemberCount ?? pod.maxMembers;
      if (!expected) {
        return '0.00';
      }
      return (pod.amount * expected).toFixed(2);
    }
    return this.calculateTotalTarget(pod.amount, pod.lifecycleWeeks);
  }

  private calculateTotalTarget(amount: number, lifecycleWeeks: number): string {
    const cycles = Math.ceil(lifecycleWeeks / 2);
    return (amount * cycles).toFixed(2);
  }

  private calculateProgress(contributed: string, target: string): number {
    const targetValue = parseFloat(target);
    if (!targetValue) {
      return 0;
    }

    const contributedValue = parseFloat(contributed ?? '0');
    const percentage = parseFloat(
      ((contributedValue / targetValue) * 100).toFixed(2),
    );
    if (!Number.isFinite(percentage)) {
      return 0;
    }

    return Math.min(100, Math.max(0, percentage));
  }

  private computeNextPayoutDate(pod: PodWithMembers): string | null {
    const reference = Date.now();
    const upcoming = pod.memberships
      .getItems()
      .map((member) => member.payoutDate?.getTime() ?? null)
      .filter((value): value is number => value !== null)
      .filter((value) => value >= reference)
      .sort((a, b) => a - b);

    if (!upcoming.length) {
      return null;
    }

    return new Date(upcoming[0]).toISOString();
  }
}
