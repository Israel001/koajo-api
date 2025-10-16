import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PodGoalType } from '../pod-goal.enum';

export class JoinPodDto {
  @ApiProperty({ enum: PodGoalType })
  @IsEnum(PodGoalType)
  goal!: PodGoalType;

  @ApiProperty({
    description: 'Custom financial goal description when goal is other.',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  goalNote?: string;
}
