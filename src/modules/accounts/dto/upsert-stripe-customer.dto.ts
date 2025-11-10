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

  @ApiProperty({ description: 'Customer address object.', required: false, type: Object })
  @IsOptional()
  address?: Record<string, unknown>;
}
