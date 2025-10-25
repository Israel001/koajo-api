import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ListAvatarsQuery } from './queries/list-avatars.query';
import type { AvatarSummary } from './contracts/avatar-result';
import { AvatarSummaryDto } from './contracts/avatar-swagger.dto';

@ApiTags('avatars')
@Controller({ path: 'avatars', version: '1' })
export class AvatarsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve available avatar definitions.' })
  @ApiQuery({
    name: 'gender',
    required: false,
    description: 'Optional gender filter (e.g. male or female).',
  })
  @ApiOkResponse({
    description: 'List of available avatars.',
    type: [AvatarSummaryDto],
  })
  async list(@Query('gender') gender?: string): Promise<AvatarSummary[]> {
    return this.queryBus.execute(new ListAvatarsQuery(gender));
  }
}
