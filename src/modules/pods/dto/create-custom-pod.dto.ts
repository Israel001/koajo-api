import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CustomPodCadence } from '../custom-pod-cadence.enum';

export class CreateCustomPodDto {
  @ApiProperty({
    description: 'Friendly name for the custom pod displayed to members.',
    example: 'October Savings Circle',
    minLength: 3,
    maxLength: 60,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    description: 'Contribution amount each member must pay per cycle.',
    example: 500,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({
    description: 'Cadence of the custom pod.',
    enum: CustomPodCadence,
    example: CustomPodCadence.BI_WEEKLY,
  })
  @IsEnum(CustomPodCadence)
  cadence!: CustomPodCadence;

  @ApiProperty({
    description: 'Whether to randomize payout positions once the pod is full.',
    example: true,
  })
  @IsBoolean()
  randomizePositions!: boolean;

  @ApiProperty({
    description:
      'List of invited participant emails (excluding the creator). Must contain between 5 and 19 entries to honour the 6-20 member constraint.',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(19)
  @IsEmail({}, { each: true })
  invitees!: string[];
}
