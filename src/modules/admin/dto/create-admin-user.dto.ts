import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminRole } from '../admin-role.enum';

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Email for the new admin user.' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password for the admin user.', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: AdminRole, description: 'Role for the admin user.' })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
