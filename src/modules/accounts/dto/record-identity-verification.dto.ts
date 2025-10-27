import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class RecordIdentityVerificationDto {
  @ApiProperty({ description: 'Stripe identity verification identifier.' })
  @Expose({ name: 'id' })
  @IsString()
  @IsNotEmpty()
  identityId!: string;

  @ApiProperty({ description: 'Stripe identity verification session identifier.' })
  @Expose({ name: 'session_id' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ description: 'Stripe identity verification result identifier.' })
  @Expose({ name: 'result_id' })
  @IsString()
  @IsNotEmpty()
  resultId!: string;

  @ApiProperty({ description: 'Status returned by Stripe for the verification.' })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiProperty({ description: 'Verification type returned by Stripe.' })
  @IsString()
  @IsNotEmpty()
  type!: string;
}
