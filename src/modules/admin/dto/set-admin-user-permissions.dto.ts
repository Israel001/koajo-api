import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SetAdminUserPermissionsDto {
  @ApiPropertyOptional({ description: 'Permission codes to explicitly grant.', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allow?: string[];

  @ApiPropertyOptional({ description: 'Permission codes to explicitly deny.', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deny?: string[];
}
