import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertStripeCustomerDto {
  @ApiProperty({
    name: 'id',
    description: 'Stripe customer identifier.',
  })
  @Expose({ name: 'id' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({
    name: 'ssn_last4',
    description: 'Last four digits of SSN.',
    required: false,
  })
  @Expose({ name: 'ssn_last4' })
  @IsOptional()
  @IsString()
  ssnLast4?: string;

  @ApiProperty({
    description: 'Customer address object.',
    required: false,
    type: Object,
  })
  @IsOptional()
  address?: Record<string, unknown>;

  @ApiProperty({
    name: 'recipient_id',
    description: 'Stripe recipient identifier (external account).',
    required: false,
  })
  @Expose({ name: 'recipient_id' })
  @IsOptional()
  @IsString()
  recipientId?: string;

  @ApiProperty({
    name: 'payout_status',
    description: 'Payout status for the customer.',
    required: false,
  })
  @Expose({ name: 'payout_status' })
  @IsOptional()
  @IsString()
  payoutStatus?: string;

  @ApiProperty({
    name: 'payout_method_id',
    description: 'Identifier of the payout method.',
    required: false,
  })
  @Expose({ name: 'payout_method_id' })
  @IsOptional()
  @IsString()
  payoutMethodId?: string;
}
