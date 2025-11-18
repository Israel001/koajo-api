import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Get,
  Query,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../accounts/guards/jwt-auth.guard';
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { RecordPayoutCommand } from '../commands/record-payout.command';
import { RecordPayoutResult } from '../contracts/payment-results';
import {
  RecordPayoutResultDto,
  PayoutListResultDto,
} from '../contracts/payment-swagger.dto';
import { PayoutQueryDto } from '../dto/payout-query.dto';
import type { PayoutListResult } from '../contracts/payment-summary';
import { ListAccountPayoutsQuery } from '../queries/list-account-payouts.query';
import { ListPodPayoutsQuery } from '../queries/list-pod-payouts.query';
import type { Response } from 'express';

@ApiTags('payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payouts received by the authenticated user across all pods.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payouts for the authenticated user.',
    type: PayoutListResultDto,
  })
  async listPayouts(
    @Req() request: AuthenticatedRequest,
    @Query() query: PayoutQueryDto,
  ): Promise<PayoutListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListAccountPayoutsQuery(
        request.user.accountId,
        limit,
        offset,
        query.status ?? null,
        query.timeframe ?? null,
        query.from ?? null,
        query.to ?? null,
        query.sort ?? null,
      ),
    );
  }

  @Get('pods/:podId')
  @ApiOperation({
    summary: 'List payouts received by the authenticated user within a specific pod.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payouts within the selected pod.',
    type: PayoutListResultDto,
  })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  async listPodPayouts(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: PayoutQueryDto,
  ): Promise<PayoutListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListPodPayoutsQuery(
        podId,
        request.user.accountId,
        limit,
        offset,
        query.status ?? null,
        query.timeframe ?? null,
        query.from ?? null,
        query.to ?? null,
        query.sort ?? null,
      ),
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Download payouts received by the authenticated user as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of payouts.' })
  async exportPayouts(
    @Req() request: AuthenticatedRequest,
    @Query() query: PayoutQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listPayouts(request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payouts.csv"');
    return this.toPayoutsCsv(result);
  }

  @Get('pods/:podId/export')
  @ApiOperation({
    summary: 'Download payouts within a specific pod as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of pod payouts.' })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  async exportPodPayouts(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: PayoutQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listPodPayouts(podId, request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payouts_${podId}.csv"`,
    );
    return this.toPayoutsCsv(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payout for a pod membership.' })
  @ApiCreatedResponse({
    description: 'Payout recorded and linked to a transaction.',
    type: RecordPayoutResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or payout reference already recorded.',
  })
  @ApiNotFoundResponse({
    description: 'Pod membership not found for the authenticated user.',
  })
  async recordPayout(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreatePayoutDto,
  ): Promise<RecordPayoutResult> {
    return this.commandBus.execute(
      new RecordPayoutCommand(
        request.user.accountId,
        payload.podId,
        payload.stripeReference,
        payload.amount,
        payload.fee,
        payload.currency,
        payload.status,
        payload.description ?? null,
      ),
    );
  }

  private toPayoutsCsv(result: PayoutListResult): string {
    const headers = [
      'id',
      'membershipId',
      'podId',
      'podName',
      'podPlanCode',
      'amount',
      'fee',
      'currency',
      'status',
      'stripeReference',
      'description',
      'recordedAt',
      'payoutDate',
    ];
    const escape = (value: unknown) => {
      const str = value ?? '';
      const s = String(str);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = result.items.map((item) =>
      [
        item.id,
        item.membershipId,
        item.podId,
        item.podName ?? '',
        item.podPlanCode,
        item.amount,
        item.fee,
        item.currency,
        item.status,
        item.stripeReference,
        item.description ?? '',
        item.recordedAt,
        item.payoutDate ?? '',
      ]
        .map(escape)
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
