import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Registered account email address.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Verification token included in the email link.',
    example: 'd4c6e8f7ab2c4d1e3f4a5b6c7d8e9f00112233445566778899aabbccddeeff00',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(64, 128)
  @Matches(/^[a-f0-9]+$/i)
  token!: string;
}
