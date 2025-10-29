import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateAdminPermissionDto {
  @ApiProperty({ description: 'Unique code for the permission.', example: 'admin.manage_users' })
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  @Matches(/^[a-z0-9_.:-]+$/i, {
    message:
      'code may only contain alphanumeric characters, dots, underscores, colons, and dashes.',
  })
  code!: string;

  @ApiPropertyOptional({ description: 'Human friendly name for the permission.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the permission.' })
  @IsOptional()
  @IsString()
  description?: string;
}
