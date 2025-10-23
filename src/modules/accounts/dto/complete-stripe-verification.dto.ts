import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
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
    description: 'Stripe verification session identifier.',
    example: 'sess_1234567890',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sessionId!: string;

  @ApiProperty({
    description: 'Stripe reference identifier associated with this verification attempt.',
    example: 'vs_1QB2m4Fo222Y9bAd3S',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  stripeReference!: string;

  @ApiProperty({
    description: 'Type of verification performed (e.g. `document`, `biometric`).',
    example: 'document',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  verificationType!: string;

  @ApiProperty({
    description: 'Current status string reported by Stripe (e.g. `pending`, `verified`).',
    example: 'verified',
    maxLength: 64,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(64)
  verificationStatus!: string;
}
