import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({
    description: 'Avatar image URL. Send null to clear the avatar.',
    example: 'https://cdn.example.com/avatars/user.png',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string | null;
}
