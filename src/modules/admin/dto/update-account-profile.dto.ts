import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class AdminUpdateAccountProfileDto {
  @ApiPropertyOptional({
    description: 'First name of the customer.',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name of the customer.',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601 format: YYYY-MM-DD).',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Phone number linked to the customer account.',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
