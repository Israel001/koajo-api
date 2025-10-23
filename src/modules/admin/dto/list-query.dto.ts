import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const toInt = ({ value }: { value: unknown }): number | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.parseInt(value, 10);
  }
  if (typeof value === 'number') {
    return value;
  }
  return undefined;
};

export class AdminListQueryDto {
  @ApiPropertyOptional({
    description: 'Search term to filter records (email or name).',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Pagination limit.',
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Pagination offset.',
    default: 0,
    minimum: 0,
  })
  @Transform(toInt)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
