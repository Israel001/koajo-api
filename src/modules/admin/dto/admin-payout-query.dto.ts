import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class AdminPayoutQueryDto {
  @ApiPropertyOptional({ description: 'Maximum records to return.', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  limit?: number;

  @ApiPropertyOptional({ description: 'Records to skip.', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filter by payout timeframe.',
    enum: ['past', 'upcoming'],
  })
  @IsOptional()
  @IsEnum(['past', 'upcoming'])
  timeframe?: 'past' | 'upcoming';

  @ApiPropertyOptional({
    description: 'Filter by payout status.',
    example: 'paid',
  })
  @IsOptional()
  status?: string;
}
