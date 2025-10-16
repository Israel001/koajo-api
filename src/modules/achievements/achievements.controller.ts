import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../accounts/guards/jwt-auth.guard';
import { GetAchievementsSummaryQuery } from './queries/get-achievements-summary.query';
import { AchievementsSummaryDto } from './dto/achievements-summary.dto';

@ApiTags('achievements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'achievements', version: '1' })
export class AchievementsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @ApiOkResponse({ type: AchievementsSummaryDto })
  async getSummary(
    @Req() request: AuthenticatedRequest,
  ): Promise<AchievementsSummaryDto> {
    const accountId = request.user.accountId;
    return this.queryBus.execute(new GetAchievementsSummaryQuery(accountId));
  }
}
