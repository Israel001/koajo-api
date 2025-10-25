import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePodPlanDto {
  @ApiProperty({
    description: 'Unique code used to identify the pod plan.',
    example: 'STANDARD-12',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,32}$/, {
    message:
      'Code must be 3-32 characters using letters, numbers, or dashes.',
  })
  code!: string;

  @ApiProperty({
    description: 'Contribution amount per cycle.',
    example: 50000,
  })
  @IsInt()
  @IsPositive()
  @Max(10_000_000)
  amount!: number;

  @ApiProperty({
    description: 'Number of weeks that the plan runs for.',
    example: 12,
  })
  @IsInt()
  @Min(1)
  @Max(520)
  lifecycleWeeks!: number;

  @ApiProperty({
    description: 'Maximum number of members allowed in pods using this plan.',
    example: 10,
  })
  @IsInt()
  @Min(2)
  @Max(500)
  maxMembers!: number;

  @ApiProperty({
    description: 'Whether the plan is active upon creation.',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
