import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toInt = ({ value }: { value: unknown }): number | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.parseInt(value, 10);
  }
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
};

export class PayoutQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of payouts to return.',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of payouts to skip before collecting the result set.',
    default: 0,
    minimum: 0,
  })
  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Filter by payout status.',
    example: 'paid',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by payout timeframe based on payout date.',
    enum: ['past', 'upcoming'],
  })
  @IsOptional()
  @IsIn(['past', 'upcoming'])
  timeframe?: 'past' | 'upcoming';

  @ApiPropertyOptional({
    description: 'Only include payouts recorded on or after this ISO date.',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Only include payouts recorded on or before this ISO date.',
    example: '2025-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Sort direction for recorded timestamp.',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';
}
