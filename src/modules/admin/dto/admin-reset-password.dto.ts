import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @ApiProperty({ description: 'Admin email address.' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password reset token provided in the reset email.' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'New password for the admin account.', minLength: 10 })
  @IsString()
  @MinLength(10)
  newPassword!: string;
}
