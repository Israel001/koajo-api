import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
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
import { AdminPermissionsGuard, RequireAdminPermissions } from '../guards/admin-permissions.guard';
import {
  ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS,
  ADMIN_PERMISSION_VIEW_USERS,
} from '../admin-permission.constants';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { UpdateNotificationPreferencesDto } from '../../accounts/dto/update-notification-preferences.dto';
import { UpdateNotificationPreferencesCommand } from '../../accounts/commands/update-notification-preferences.command';
import { GetAchievementsSummaryQuery } from '../../achievements/queries/get-achievements-summary.query';
import type { AchievementsSummaryDto } from '../../achievements/dto/achievements-summary.dto';
import {
  AdminAccountDetail,
  AdminAccountsListResult,
} from '../contracts/admin-results';
import { ListAdminAccountsQuery } from '../queries/list-admin-accounts.query';
import { GetAdminAccountQuery } from '../queries/get-admin-account.query';
import { ListAllAdminAccountsQuery } from '../queries/list-all-admin-accounts.query';

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
  async list(@Query() query: AdminListQueryDto): Promise<AdminAccountsListResult> {
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

  @Get(':accountId')
  @ApiOperation({ summary: 'Get account details by ID' })
  @ApiOkResponse({ description: 'Account fetched.' })
  @ApiNotFoundResponse({ description: 'Account not found.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async getOne(@Param('accountId') accountId: string): Promise<AdminAccountDetail> {
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

  @Get(':accountId/achievements')
  @ApiOperation({ summary: 'Fetch achievement summary for an account' })
  @ApiOkResponse({ description: 'Achievements summary fetched.' })
  @RequireAdminPermissions(ADMIN_PERMISSION_VIEW_USERS)
  async achievements(
    @Param('accountId') accountId: string,
  ): Promise<AchievementsSummaryDto> {
    return this.queryBus.execute(new GetAchievementsSummaryQuery(accountId));
  }
}
