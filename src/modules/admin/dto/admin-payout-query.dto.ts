import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsOptional()
  @IsIn(['past', 'upcoming'])
  timeframe?: 'past' | 'upcoming';

  @ApiPropertyOptional({
    description: 'Filter by payout status.',
    example: 'paid',
  })
  @IsOptional()
  status?: string;
}
