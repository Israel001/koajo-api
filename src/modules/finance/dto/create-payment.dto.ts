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

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Identifier of the pod to attribute the payment to.',
    example: 'a7d2eae4-3b15-4c7e-a317-823ddc93592b',
  })
  @IsUUID()
  podId!: string;

  @ApiProperty({
    description: 'Stripe reference identifier for this payment.',
    example: 'pi_1QB2m4Fo222Y9bAd3S',
    maxLength: 128,
  })
  @IsString()
  @MaxLength(128)
  stripeReference!: string;

  @ApiProperty({
    description: 'Payment amount in major currency units.',
    example: 5000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'ISO currency code (e.g. NGN, USD).',
    example: 'NGN',
    maxLength: 16,
  })
  @IsString()
  @MaxLength(16)
  currency!: string;

  @ApiProperty({
    description: 'Status returned from Stripe when the payment was recorded.',
    example: 'succeeded',
    maxLength: 64,
  })
  @IsString()
  @MaxLength(64)
  status!: string;

  @ApiProperty({
    description: 'Optional description or memo for the payment.',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
