import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminListQueryDto } from '../dto/list-query.dto';
import { AdminPodActivityQueryDto } from '../dto/pod-activity-query.dto';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import {
  AdminPodDetail,
  AdminPodsListResult,
  AdminPodActivity,
} from '../contracts/admin-results';
import { ListAdminPodsQuery } from '../queries/list-admin-pods.query';
import { GetAdminPodQuery } from '../queries/get-admin-pod.query';
import { ListAdminPodActivitiesQuery } from '../queries/list-admin-pod-activities.query';
import { AdminPodActivityDto } from '../contracts/admin-swagger.dto';

@ApiTags('admin-pods')
@Controller({ path: 'admin/pods', version: '1' })
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('bearer')
@ApiUnauthorizedResponse({ description: 'Admin authentication required.' })
export class AdminPodsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'List pods' })
  @ApiOkResponse({ description: 'Pods fetched.' })
  async list(@Query() query: AdminListQueryDto): Promise<AdminPodsListResult> {
    return this.queryBus.execute(
      new ListAdminPodsQuery(query.limit, query.offset),
    );
  }

  @Get(':podId')
  @ApiOperation({ summary: 'Get pod details' })
  @ApiOkResponse({ description: 'Pod fetched.' })
  @ApiNotFoundResponse({ description: 'Pod not found.' })
  async getOne(@Param('podId') podId: string): Promise<AdminPodDetail> {
    return this.queryBus.execute(new GetAdminPodQuery(podId));
  }

  @Get(':podId/activities')
  @ApiOperation({ summary: 'List activities recorded for a pod' })
  @ApiOkResponse({
    description: 'Pod activities fetched.',
    type: [AdminPodActivityDto],
  })
  async listActivities(
    @Param('podId') podId: string,
    @Query() query: AdminPodActivityQueryDto,
  ): Promise<AdminPodActivity[]> {
    const limit = query.limit ?? 50;
    return this.queryBus.execute(
      new ListAdminPodActivitiesQuery(podId, limit),
    );
  }
}
