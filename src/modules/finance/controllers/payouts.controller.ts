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
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { RecordPayoutCommand } from '../commands/record-payout.command';
import { RecordPayoutResult } from '../contracts/payment-results';
import { RecordPayoutResultDto } from '../contracts/payment-swagger.dto';

@ApiTags('payouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
@Controller({ path: 'payouts', version: '1' })
export class PayoutsController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
