import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminRoleDto {
  @ApiProperty({ description: 'Unique name for the admin role.' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ description: 'Short description of the role.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of permission IDs (passed as permissionCodes) that should be linked to the role.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}
