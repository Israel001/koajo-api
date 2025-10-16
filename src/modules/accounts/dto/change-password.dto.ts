import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for the authenticated account.',
    example: 'Curr3ntP@ss!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  currentPassword!: string;

  @ApiProperty({
    description: 'Desired new password meeting strong password requirements.',
    example: 'N3wStr0ngP@ssword!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsStrongPassword({
    minLength: 8,
    minUppercase: 1,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword!: string;
}
