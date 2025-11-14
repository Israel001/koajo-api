import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class AdminAccountPodsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter pods by status.',
    enum: ['current', 'completed', 'all'],
    default: 'current',
  })
  @IsOptional()
  @IsIn(['current', 'completed', 'all'])
  filter?: 'current' | 'completed' | 'all';
}
