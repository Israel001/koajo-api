import { ApiProperty } from '@nestjs/swagger';
import type { AvatarSummary } from './avatar-result';

export class AvatarSummaryDto implements AvatarSummary {
  @ApiProperty({ description: 'Avatar identifier.' })
  id!: string;

  @ApiProperty({
    description: 'Accessible description that can be used as alt text.',
  })
  altText!: string;

  @ApiProperty({
    description: 'Indicates if the avatar should be considered a default option.',
  })
  isDefault!: boolean;

  @ApiProperty({
    description: 'Gender associated with the avatar.',
    example: 'male',
  })
  gender!: string;

  @ApiProperty({ description: 'ISO timestamp when the avatar was created.' })
  createdAt!: string;

  @ApiProperty({ description: 'ISO timestamp when the avatar was last updated.' })
  updatedAt!: string;
}
