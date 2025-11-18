import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../accounts/guards/jwt-auth.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { RecordPaymentCommand } from '../commands/record-payment.command';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { RecordPaymentResult } from '../contracts/payment-results';
import {
  PaymentListResultDto,
  RecordPaymentResultDto,
} from '../contracts/payment-swagger.dto';
import { ListAccountPaymentsQuery } from '../queries/list-account-payments.query';
import { ListPodPaymentsQuery } from '../queries/list-pod-payments.query';
import type { PaymentListResult } from '../contracts/payment-summary';
import type { Response } from 'express';

@ApiTags('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payments made by the authenticated user across all pods.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payments for the authenticated user.',
    type: PaymentListResultDto,
  })
  async listPayments(
    @Req() request: AuthenticatedRequest,
    @Query() query: PaymentQueryDto,
  ): Promise<PaymentListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListAccountPaymentsQuery(
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
    summary:
      'List payments made by the authenticated user within a specific pod.',
  })
  @ApiOkResponse({
    description: 'Paginated list of payments for the selected pod.',
    type: PaymentListResultDto,
  })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  async listPodPayments(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: PaymentQueryDto,
  ): Promise<PaymentListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    return this.queryBus.execute(
      new ListPodPaymentsQuery(
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
    summary: 'Download payments made by the authenticated user as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of payments.' })
  async exportPayments(
    @Req() request: AuthenticatedRequest,
    @Query() query: PaymentQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listPayments(request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=\"payments.csv\"',
    );
    return this.toPaymentsCsv(result);
  }

  @Get('pods/:podId/export')
  @ApiOperation({
    summary: 'Download payments within a specific pod as CSV.',
  })
  @ApiOkResponse({ description: 'CSV export of pod payments.' })
  @ApiNotFoundResponse({
    description: 'Pod not found or not accessible to the authenticated user.',
  })
  async exportPodPayments(
    @Param('podId') podId: string,
    @Req() request: AuthenticatedRequest,
    @Query() query: PaymentQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const result = await this.listPodPayments(podId, request, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"payments_${podId}.csv\"`,
    );
    return this.toPaymentsCsv(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a contribution payment for a pod membership.',
  })
  @ApiCreatedResponse({
    description: 'Payment recorded and linked to a transaction.',
    type: RecordPaymentResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or payment reference already recorded.',
  })
  @ApiNotFoundResponse({
    description: 'Pod membership not found for the authenticated user.',
  })
  async recordPayment(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreatePaymentDto,
  ): Promise<RecordPaymentResult> {
    return this.commandBus.execute(
      new RecordPaymentCommand(
        request.user.accountId,
        payload.podId,
        payload.stripeReference,
        payload.amount,
        payload.currency,
        payload.status,
        payload.description ?? null,
      ),
    );
  }

  private toPaymentsCsv(result: PaymentListResult): string {
    const headers = [
      'id',
      'membershipId',
      'podId',
      'podName',
      'podPlanCode',
      'amount',
      'currency',
      'status',
      'stripeReference',
      'description',
      'recordedAt',
    ];
    const escape = (value: unknown) => {
      const str = value ?? '';
      const s = String(str);
      if (s.includes('\"') || s.includes(',') || s.includes('\n')) {
        return `\"${s.replace(/\"/g, '\"\"')}\"`;
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
        item.currency,
        item.status,
        item.stripeReference,
        item.description ?? '',
        item.recordedAt,
      ]
        .map(escape)
        .join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
