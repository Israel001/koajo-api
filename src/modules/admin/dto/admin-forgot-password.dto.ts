import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AdminForgotPasswordDto {
  @ApiProperty({ description: 'Admin email address.' })
  @IsEmail()
  email!: string;
}
