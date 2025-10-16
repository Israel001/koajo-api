import { ApiProperty } from '@nestjs/swagger';

export class PodMemberSlotDto {
  @ApiProperty({ description: 'Opaque identifier for the member within the pod.' })
  publicId!: string;

  @ApiProperty({ description: 'Position in the payout order.', example: 1 })
  order!: number;

  @ApiProperty({
    description: 'ISO datetime indicating when the payout is scheduled.',
    example: '2025-01-15T00:00:00.000Z',
    nullable: true,
  })
  payoutDate!: string | null;

  @ApiProperty({ description: 'True if this slot corresponds to the requesting account.' })
  isYou!: boolean;
}
