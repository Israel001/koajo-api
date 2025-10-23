import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminDashboardResult } from '../contracts/admin-results';
import { AdminDashboardResultDto } from '../contracts/admin-swagger.dto';
import { AdminDashboardQuery } from '../queries/admin-dashboard.query';

@ApiTags('admin-dashboard')
@Controller({ path: 'admin/dashboard', version: '1' })
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminDashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve aggregated statistics for the admin dashboard.' })
  @ApiOkResponse({
    description: 'Aggregated metrics and recent activity for the dashboard.',
    type: AdminDashboardResultDto,
  })
  async getDashboard(): Promise<AdminDashboardResult> {
    return this.queryBus.execute(new AdminDashboardQuery());
  }
}
