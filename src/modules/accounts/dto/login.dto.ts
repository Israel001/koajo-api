import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Account email address.',
    example: 'user@example.com',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password used for authentication.',
    example: 'Str0ngP@ssword!',
    minLength: 8,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value : value))
  @IsString()
  @MinLength(8)
  password!: string;
}
