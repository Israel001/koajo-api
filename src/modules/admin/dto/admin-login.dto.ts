import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ description: 'Admin email address.', example: 'superadmin@koajo.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Admin password.', example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
