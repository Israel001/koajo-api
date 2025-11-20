import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PodStatus } from '../../pods/pod-status.enum';

export class AdminPodsQueryDto {
  @ApiPropertyOptional({ description: 'Maximum number of records to return.', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination.', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description:
      'Search string applied to pod id, plan code, pod name, amount, member count, lifecycle weeks, or status.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by pod status.',
    enum: PodStatus,
  })
  @IsOptional()
  @IsEnum(PodStatus)
  status?: PodStatus;

  @ApiPropertyOptional({
    description:
      'Filter pods that have members ("true") or no members ("false"). Leave empty to return both.',
  })
  @IsOptional()
  @IsString()
  hasMembers?: string;
}
