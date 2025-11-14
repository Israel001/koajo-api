import { Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  @ApiProperty({
    description: 'Optional avatar image URL.',
    example: 'https://cdn.example.com/avatars/user.png',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string | null;

  @ApiProperty({
    name: 'first_name',
    description: 'First name of the account holder.',
    example: 'Jane',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  first_name!: string;

  @ApiProperty({
    name: 'last_name',
    description: 'Last name of the account holder.',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  last_name!: string;
}
