import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwapPayoutPositionDto {
  @ApiProperty({ description: 'First membership id to swap.' })
  @IsUUID('4')
  firstMembershipId!: string;

  @ApiProperty({ description: 'Second membership id to swap.' })
  @IsUUID('4')
  secondMembershipId!: string;
}
