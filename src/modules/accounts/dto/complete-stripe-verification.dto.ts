import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteStripeVerificationDto {
  @ApiProperty({
    description: 'Registered account email address.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'First name returned from Stripe identity verification.',
    example: 'Jane',
    maxLength: 60,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({
    description: 'Last name returned from Stripe identity verification.',
    example: 'Doe',
    maxLength: 60,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName!: string;

  @ApiProperty({
    description: 'Indicates whether Stripe identity verification completed successfully.',
    example: true,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    return value;
  })
  @IsBoolean()
  stripeVerificationCompleted!: boolean;

  @ApiProperty({
    description: 'Count of Stripe verification attempts recorded.',
    example: 2,
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  verificationAttemptCount?: number;

  @ApiProperty({
    description: 'ISO timestamp of the first recorded Stripe verification attempt.',
    example: '2024-05-01T09:30:00.000Z',
    required: false,
  })
  @IsISO8601({ strict: true })
  @IsOptional()
  verificationFirstAttemptDate?: string;

  @ApiProperty({
    description: 'ISO timestamp of the most recent Stripe verification attempt.',
    example: '2024-05-02T16:45:00.000Z',
    required: false,
  })
  @IsISO8601({ strict: true })
  @IsOptional()
  verificationLastAttemptDate?: string;

  @ApiProperty({
    description: 'Current status string reported by Stripe (e.g. `pending`, `verified`).',
    example: 'pending',
    required: false,
    maxLength: 64,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(64)
  @IsOptional()
  verificationStatus?: string;
}
