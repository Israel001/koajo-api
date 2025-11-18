import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../accounts/guards/jwt-auth.guard';
import { TransactionQueryDto } from '../dto/transaction-query.dto';
import type { TransactionListResult } from '../contracts/payment-summary';
import { TransactionListResultDto } from '../contracts/payment-swagger.dto';
import { ListAccountTransactionsQuery } from '../queries/list-account-transactions.query';
import { ListPodTransactionsQuery } from '../queries/list-pod-transactions.query';
import type { Response } from 'express';

@ApiTags('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: 'List payment and payout transactions for the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Paginated list of transactions for the authenticated user.',
    type: TransactionListResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async listTransactions(
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const type = query.type ?? 'all';
    const sort = query.sort ?? 'desc';
    return this.queryBus.execute(
      new ListAccountTransactionsQuery(
        request.user.accountId,
        limit,
        offset,
        type,
        query.status ?? null,
        query.timeframe ?? null,
        query.from ?? null,
        query.to ?? null,
        sort,
      ),
    );
  }

  @Get('export')
  @ApiOperation({
    summary: 'Download payment and payout transactions for the authenticated user as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of transactions.' })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async exportTransactions(
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listTransactions(request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="transactions.csv"',
    );
    return this.toTransactionsCsv(result);
  }

  @Get('pods/:podId')
  @ApiOperation({
    summary:
      'List payment and payout transactions for the authenticated user within a specific pod.',
  })
  @ApiOkResponse({
    description: 'Paginated list of transactions for the selected pod.',
    type: TransactionListResultDto,
  })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async listPodTransactions(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const type = query.type ?? 'all';
    const sort = query.sort ?? 'desc';
    return this.queryBus.execute(
      new ListPodTransactionsQuery(
        podId,
        request.user.accountId,
        limit,
        offset,
        type,
        query.status ?? null,
        query.timeframe ?? null,
        query.from ?? null,
        query.to ?? null,
        sort,
      ),
    );
  }

  @Get('pods/:podId/export')
  @ApiOperation({
    summary:
      'Download payment and payout transactions for the authenticated user within a specific pod as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of pod transactions.' })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters.',
  })
  async exportPodTransactions(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: TransactionQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listPodTransactions(podId, request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transactions_${podId}.csv"`,
    );
    return this.toTransactionsCsv(result);
  }

  private toTransactionsCsv(result: TransactionListResult): string {
    const headers = [
      'id',
      'type',
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
        item.type,
        item.membershipId,
        item.podId,
        item.podName ?? '',
        item.podPlanCode,
        item.amount,
        item.fee ?? '',
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
