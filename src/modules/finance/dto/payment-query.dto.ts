import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const toInt = ({ value }: { value: unknown }): number | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.parseInt(value, 10);
  }
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
};

export class PaymentQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of payments to return.',
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
    description: 'Number of payments to skip before collecting the result set.',
    default: 0,
    minimum: 0,
  })
  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
