import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../accounts/guards/jwt-auth.guard';
import { GetUserFinanceSummaryQuery } from '../queries/get-user-finance-summary.query';
import { UserFinanceSummaryDto } from '../contracts/finance-summary.dto';
import type { UserFinanceSummary } from '../contracts/finance-summary';

@ApiTags('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'dashboard', version: '1' })
export class DashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'Retrieve lifetime totals for contributions and payouts across all pods.',
  })
  @ApiOkResponse({
    description: 'Lifetime totals fetched.',
    type: UserFinanceSummaryDto,
  })
  async getSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<UserFinanceSummary> {
    return this.queryBus.execute(
      new GetUserFinanceSummaryQuery(request.user.accountId),
    );
  }
}
