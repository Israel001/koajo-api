import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AcceptCustomPodInviteDto {
  @ApiProperty({
    description: 'Invitation token supplied via email.',
    example: 'b2d1c5e4f7a8...',
  })
  @IsString()
  @Length(64, 128)
  token!: string;
}
