import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminRefreshTokenDto {
  @ApiProperty({ description: 'Refresh token issued during login.', minLength: 1 })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
