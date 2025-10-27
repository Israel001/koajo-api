import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertStripeCustomerDto {
  @ApiProperty({ description: 'Stripe customer identifier.' })
  @Expose({ name: 'id' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ description: 'Application user identifier linked to the customer.', required: false })
  @Expose({ name: 'user_id' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Last four digits of SSN.', required: false })
  @Expose({ name: 'ssn_last4' })
  @IsOptional()
  @IsString()
  ssnLast4?: string;

  @ApiProperty({ description: 'Customer address object.', required: false, type: Object })
  @IsOptional()
  address?: Record<string, unknown>;
}
