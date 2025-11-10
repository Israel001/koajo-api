import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token issued when remember me was selected.',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
