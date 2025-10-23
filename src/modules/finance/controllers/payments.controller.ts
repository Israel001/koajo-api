import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../accounts/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../accounts/guards/jwt-auth.guard';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { RecordPaymentCommand } from '../commands/record-payment.command';
import { RecordPaymentResult } from '../contracts/payment-results';
import { RecordPaymentResultDto } from '../contracts/payment-swagger.dto';

@ApiTags('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a contribution payment for a pod membership.' })
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
}
