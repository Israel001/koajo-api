import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { ListAdminAchievementsQuery } from '../queries/list-admin-achievements.query';
import { AdminAchievementDefinition } from '../contracts/admin-results';

@ApiTags('admin-achievements')
@Controller({ path: 'admin/achievements', version: '1' })
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminAchievementsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List achievement definitions' })
  @ApiOkResponse({ description: 'Achievement definitions fetched.' })
  async list(): Promise<AdminAchievementDefinition[]> {
    return this.queryBus.execute(new ListAdminAchievementsQuery());
  }
}
