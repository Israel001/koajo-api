import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    description: 'Registered account email address.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Frontend origin (protocol + host) to use when building the verification link.',
    example: 'https://app.koajo.test',
  })
  @IsOptional()
  @IsString()
  origin?: string;
}
