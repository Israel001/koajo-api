import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import {
  AdminPermissionsGuard,
  RequireAdminPermissions,
} from '../guards/admin-permissions.guard';
import {
  ADMIN_PERMISSION_EDIT_USER_DETAILS,
  ADMIN_PERMISSION_TOGGLE_USER_STATUS,
  ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS,
  ADMIN_PERMISSION_VIEW_USERS,
  ADMIN_PERMISSION_DELETE_USERS,
} from '../admin-permission.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { UpdateNotificationPreferencesDto } from '../../accounts/dto/update-notification-preferences.dto';
import { UpdateNotificationPreferencesCommand } from '../../accounts/commands/update-notification-preferences.command';
import { UpdateAccountFlagsDto } from '../dto/update-account-flags.dto';
import { UpdateAccountFlagsCommand } from '../../accounts/commands/update-account-flags.command';
import { RemoveAccountBankCommand } from '../../accounts/commands/remove-account-bank.command';
import { AdminUpdateAccountProfileDto } from '../dto/update-account-profile.dto';
import { GetAchievementsSummaryQuery } from '../../achievements/queries/get-achievements-summary.query';
import type { AchievementsSummaryDto } from '../../achievements/dto/achievements-summary.dto';
import {
  AdminAccountDetail,
  AdminAccountPodMembership,
  AdminAccountVerificationsListResult,
  AdminAccountsListResult,
} from '../contracts/admin-results';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { GetAdminAccountQuery } from '../queries/get-admin-account.query';
import { ListAllAdminAccountsQuery } from '../queries/list-all-admin-accounts.query';
import { ListAccountPodsQuery } from '../../pods/queries/list-account-pods.query';
import type { MembershipWithPod } from '../../pods/types';
import { PodStatus } from '../../pods/pod-status.enum';
import {
  AdminAccountPodMembershipDto,
  AdminAccountVerificationsListResultDto,
} from '../contracts/admin-swagger.dto';
import { ListAccountVerificationAttemptsQuery } from '../queries/list-account-verification-attempts.query';
import { UpdateUserProfileCommand } from '../../accounts/commands/update-user-profile.command';
import {
  DeleteAccountResult,
  UpdateUserProfileResult,
} from '../../accounts/contracts/auth-results';
import {
  DeleteAccountResultDto,
  UpdateUserProfileResultDto,
} from '../../accounts/contracts/auth-swagger.dto';
import { UpdateAccountStatusCommand } from '../../accounts/commands/update-account-status.command';
import { UpdateAccountStatusDto } from '../dto/update-account-status.dto';
import { AdminAccountPodsQueryDto } from '../dto/account-pods-query.dto';
import { DeleteAccountCommand } from '../../accounts/commands/delete-account.command';

@ApiTags('admin-accounts')
@Controller({ path: 'admin/accounts', version: '1' })
@UseGuards(AdminJwtGuard, AdminPermissionsGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminAccountsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List customer accounts' })
  @ApiOkResponse({ description: 'Accounts fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async list(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminAccountsListResult> {
    return this.queryBus.execute(
      new ListAdminAccountsQuery(query.limit, query.offset, query.search),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'List all customer accounts without pagination' })
  @ApiOkResponse({ description: 'All accounts fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async listAll(): Promise<AdminAccountDetail[]> {
    return this.queryBus.execute(new ListAllAdminAccountsQuery());
  }

  @Get('verifications')
  @ApiOperation({
    summary: 'List identity verification attempts with Stripe session details',
  })
  @ApiOkResponse({
    description: 'Verification attempts fetched.',
    type: AdminAccountVerificationsListResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async listVerifications(
    @Query() query: AdminListQueryDto,
  ): Promise<AdminAccountVerificationsListResult> {
    return this.queryBus.execute(
      new ListAccountVerificationAttemptsQuery(query.limit, query.offset),
    );
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account details by ID' })
  @ApiOkResponse({ description: 'Account fetched.' })
  @ApiNotFoundResponse({ description: 'Account not found.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async getOne(
    @Param('accountId') accountId: string,
  ): Promise<AdminAccountDetail & { bankAccount: unknown | null }> {
    return this.queryBus.execute(new GetAdminAccountQuery(accountId));
  }

  @Patch(':accountId/notifications')
  @ApiOperation({ summary: 'Update notification preferences for an account' })
  @ApiOkResponse({ description: 'Notification preferences updated.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS)
  async updateNotifications(
    @Param('accountId') accountId: string,
    @Body() payload: UpdateNotificationPreferencesDto,
  ): Promise<{
    emailNotificationsEnabled: boolean;
    transactionNotificationsEnabled: boolean;
  }> {
    return this.commandBus.execute(
      new UpdateNotificationPreferencesCommand(
        accountId,
        payload.emailNotificationsEnabled,
        payload.transactionNotificationsEnabled,
      ),
    );
  }

  @Patch(':accountId/status')
  @ApiOperation({ summary: 'Activate or deactivate a customer account' })
  @ApiOkResponse({
    description: 'Account status updated.',
    schema: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean' },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_TOGGLE_USER_STATUS)
  async updateStatus(
    @Param('accountId') accountId: string,
    @Body() payload: UpdateAccountStatusDto,
  ): Promise<{ isActive: boolean }> {
    const account = await this.commandBus.execute(
      new UpdateAccountStatusCommand(accountId, payload.isActive),
    );

    return {
      isActive: account.isActive,
    };
  }

  @Patch(':accountId/profile')
  @ApiOperation({ summary: 'Update core profile information for an account' })
  @ApiOkResponse({
    description: 'Profile information updated.',
    type: UpdateUserProfileResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_EDIT_USER_DETAILS)
  async updateProfile(
    @Param('accountId') accountId: string,
    @Body() payload: AdminUpdateAccountProfileDto,
  ): Promise<UpdateUserProfileResult> {
    return this.commandBus.execute(
      new UpdateUserProfileCommand(
        accountId,
        payload.firstName,
        payload.lastName,
        payload.dateOfBirth,
        payload.phone,
        null,
        true,
      ),
    );
  }

  @Patch(':accountId/flags')
  @ApiOperation({
    summary: 'Update fraud or missed payment flags for an account',
  })
  @ApiOkResponse({
    description: 'Account flags updated.',
    schema: {
      type: 'object',
      properties: {
        fraudReview: { type: 'boolean' },
        missedPayment: { type: 'boolean' },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS)
  async updateFlags(
    @Param('accountId') accountId: string,
    @Body() payload: UpdateAccountFlagsDto,
  ): Promise<{
    fraudReview: boolean;
    missedPayment: boolean;
    overheat: boolean;
  }> {
    const account = await this.commandBus.execute(
      new UpdateAccountFlagsCommand(
        accountId,
        payload.fraudReview,
        payload.missedPayment,
        payload.overheat,
      ),
    );

    return {
      fraudReview: account.requiresFraudReview,
      missedPayment: account.missedPaymentFlag,
      overheat: account.overheatFlag,
    };
  }

  @Delete(':accountId/bank-account')
  @ApiOperation({ summary: 'Remove the bank account linked to a customer' })
  @ApiOkResponse({
    description: 'Bank account removed for the customer.',
    schema: {
      type: 'object',
      properties: {
        removed: { type: 'boolean' },
      },
    },
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS)
  async removeBankAccount(
    @Param('accountId') accountId: string,
  ): Promise<{ removed: boolean }> {
    await this.commandBus.execute(new RemoveAccountBankCommand(accountId));
    return { removed: true };
  }

  @Delete(':accountId')
  @ApiOperation({ summary: 'Delete a customer account' })
  @ApiOkResponse({
    description: 'Account deleted.',
    type: DeleteAccountResultDto,
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_DELETE_USERS)
  async deleteAccount(
    @Param('accountId') accountId: string,
  ): Promise<DeleteAccountResult> {
    return this.commandBus.execute(new DeleteAccountCommand(accountId));
  }

  @Get(':accountId/achievements')
  @ApiOperation({ summary: 'Fetch achievement summary for an account' })
  @ApiOkResponse({ description: 'Achievements summary fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async achievements(
    @Param('accountId') accountId: string,
  ): Promise<AchievementsSummaryDto> {
    return this.queryBus.execute(new GetAchievementsSummaryQuery(accountId));
  }

  @Get(':accountId/pods')
  @ApiOperation({
    summary: 'List pods for an account with optional status filter',
  })
  @ApiOkResponse({
    description: 'Pods fetched.',
    type: [AdminAccountPodMembershipDto],
  })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async pods(
    @Param('accountId') accountId: string,
    @Query() query: AdminAccountPodsQueryDto,
  ): Promise<AdminAccountPodMembership[]> {
    const filter = query.filter ?? 'current';
    return this.fetchAccountPods(accountId, filter);
  }

  private async fetchAccountPods(
    accountId: string,
    filter: 'current' | 'completed' | 'all',
  ): Promise<AdminAccountPodMembership[]> {
    const memberships = (await this.queryBus.execute(
      new ListAccountPodsQuery(accountId),
    )) as MembershipWithPod[];

    let filtered = memberships;
    if (filter === 'completed') {
      filtered = memberships.filter(
        (membership) => membership.pod.status === PodStatus.COMPLETED,
      );
    } else if (filter === 'current') {
      filtered = memberships.filter(
        (membership) => membership.pod.status !== PodStatus.COMPLETED,
      );
    }

    return filtered.map((membership) =>
      this.toAdminAccountPodMembership(membership),
    );
  }

  private toAdminAccountPodMembership(
    membership: MembershipWithPod,
  ): AdminAccountPodMembership {
    const pod = membership.pod;
    return {
      membershipId: membership.id,
      podId: pod.id,
      planCode: pod.planCode,
      name: pod.name ?? null,
      amount: pod.amount,
      lifecycleWeeks: pod.lifecycleWeeks,
      maxMembers: pod.maxMembers,
      status: pod.status,
      podType: pod.type,
      cadence: pod.cadence ?? null,
      joinOrder: membership.joinOrder,
      finalOrder: membership.finalOrder ?? null,
      payoutDate: membership.payoutDate?.toISOString() ?? null,
      paidOut: membership.paidOut,
      joinedAt: membership.joinedAt.toISOString(),
      totalContributed: membership.totalContributed ?? '0.00',
      goalType: membership.goalType,
      goalNote: membership.goalNote ?? null,
      completedAt: pod.completedAt?.toISOString() ?? null,
      payoutAmount: membership.payoutAmount ?? null,
    };
  }
}
