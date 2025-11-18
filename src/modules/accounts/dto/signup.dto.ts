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

  @ApiProperty({
    name: 'dob',
    description: 'Date of birth in mm-dd-yyyy format.',
    example: '01-15-1990',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^\d{2}-\d{2}-\d{4}$/, {
    message: 'dob must be in mm-dd-yyyy format',
  })
  dob!: string;

  @ApiProperty({
    name: 'line1',
    description: 'Address line 1.',
    example: '123 Main St',
  })
  @IsString()
  @MinLength(1)
  line1!: string;

  @ApiProperty({
    name: 'city',
    description: 'City.',
    example: 'Lagos',
  })
  @IsString()
  @MinLength(1)
  city!: string;

  @ApiProperty({
    name: 'state',
    description: 'State or province.',
    example: 'LA',
  })
  @IsString()
  @MinLength(1)
  state!: string;

  @ApiProperty({
    name: 'postal_code',
    description: 'Postal or ZIP code.',
    example: '100001',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  postal_code!: string;

  @ApiProperty({
    name: 'country',
    description: 'Country code (ISO alpha-2).',
    example: 'NG',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a 2-letter code' })
  country!: string;
}
