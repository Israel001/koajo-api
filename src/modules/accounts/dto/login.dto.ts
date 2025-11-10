import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Account email address.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password used for authentication.',
    example: 'Str0ngP@ssword!',
    minLength: 8,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value : value))
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    description: 'If true, a refresh token is issued for long-lived sessions.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
