import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsStrongPassword, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export class SignupDto {
  @ApiProperty({
    description: 'Email address for the new account.',
    example: 'user@example.com',
    maxLength: 320,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description: 'Contact phone number in E.164 format.',
    example: '+2348012345678',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @Matches(E164_REGEX, {
    message: 'Phone number must be in E.164 format (e.g. +2348012345678)',
  })
  phoneNumber!: string;

  @ApiProperty({
    description: 'Desired password meeting strong password requirements.',
    example: 'Str0ngP@ssword!',
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
  password!: string;
}
