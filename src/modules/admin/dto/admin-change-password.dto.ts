import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminChangePasswordDto {
  @ApiProperty({ description: 'Current password for the admin account.' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password to set for the admin account.', minLength: 10 })
  @IsString()
  @MinLength(10)
  newPassword!: string;
}
