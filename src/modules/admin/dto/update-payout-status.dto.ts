import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePayoutStatusDto {
  @ApiProperty({ enum: ['success', 'failed', 'other'] })
  @IsIn(['success', 'failed', 'other'])
  status!: 'success' | 'failed' | 'other';

  @ApiProperty({
    description: 'Custom status label when status is set to other.',
    required: false,
  })
  @IsOptional()
  @IsString()
  customStatus?: string | null;
}
