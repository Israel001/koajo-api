import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MinLength, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email associated with the account.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Password reset token supplied in the email link.',
    example: 'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(64, 128)
  @Matches(/^[a-f0-9]+$/i)
  token!: string;

  @ApiProperty({
    description: 'New password that meets strong password requirements.',
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
