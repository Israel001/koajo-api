import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    name: 'first_name',
    description: 'First name of the user.',
  })
  @Expose({ name: 'first_name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    name: 'last_name',
    description: 'Last name of the user.',
  })
  @Expose({ name: 'last_name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    name: 'date_of_birth',
    description: 'ISO-8601 date of birth (YYYY-MM-DD).',
  })
  @Expose({ name: 'date_of_birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    name: 'phone',
    description: 'Phone number to associate with the account.',
  })
  @Expose({ name: 'phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Frontend origin (protocol + host) to use for verification callbacks.',
    example: 'https://app.koajo.test',
  })
  @IsOptional()
  @IsString()
  origin?: string;
}
