import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TriggerPayoutDto {
  @ApiProperty({
    description: 'Pod membership identifier to trigger payout for.',
  })
  @IsUUID('4')
  membershipId!: string;
}
