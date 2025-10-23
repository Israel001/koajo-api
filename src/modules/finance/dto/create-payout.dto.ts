import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePayoutDto {
  @ApiProperty({
    description: 'Identifier of the pod for which the payout applies.',
    example: 'a7d2eae4-3b15-4c7e-a317-823ddc93592b',
  })
  @IsUUID()
  podId!: string;

  @ApiProperty({
    description: 'Stripe reference identifier for this payout.',
    example: 'po_1QB2m4Fo222Y9bAd3S',
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  stripeReference!: string;

  @ApiProperty({
    description: 'Payout amount in major currency units.',
    example: 5000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Fee amount deducted from the payout in major currency units.',
    example: 100,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  fee!: number;

  @ApiProperty({
    description: 'ISO currency code (e.g. NGN, USD).',
    example: 'NGN',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  currency!: string;

  @ApiProperty({
    description: 'Status returned from Stripe when the payout was recorded.',
    example: 'paid',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  status!: string;

  @ApiProperty({
    description: 'Optional description or memo for the payout.',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
