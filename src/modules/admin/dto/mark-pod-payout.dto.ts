import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class MarkPodPayoutDto {
  @ApiProperty({ description: 'Pod membership identifier.' })
  @IsString()
  @IsNotEmpty()
  membershipId!: string;

  @ApiProperty({
    description: 'Amount paid to the member for this pod.',
    example: 5000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    description: 'Optional note to associate with the payout.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string | null;
}
