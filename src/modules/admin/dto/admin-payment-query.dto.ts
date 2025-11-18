import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminPaymentQueryDto {
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
    description: 'Filter by payment or payout status.',
    example: 'succeeded',
  })
  @IsOptional()
  @IsString()
  status?: string;
}
