import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsUUID } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ description: 'Email for the new admin user.' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Given name for the admin user.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Family name for the admin user.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Contact phone number for the admin user.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @ApiProperty({
    description: 'Role identifiers that should be associated with the admin user.',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];

  @ApiPropertyOptional({
    description: 'Permission codes to explicitly grant to the admin user.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowPermissions?: string[];

  @ApiPropertyOptional({
    description: 'Permission codes to explicitly remove from the admin user.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  denyPermissions?: string[];

  @ApiPropertyOptional({
    description:
      'When true, the system will generate a secure password for the admin user.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generatePassword: boolean = true;

  @ApiPropertyOptional({
    description:
      'Password to assign to the admin user when automatic generation is disabled.',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @ValidateIf((instance: CreateAdminUserDto) => !instance.generatePassword)
  password?: string;

  @ApiPropertyOptional({
    description: 'Template code to use for the admin invitation email.',
    example: 'admin_invite',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_\-]+$/i, {
    message: 'inviteTemplateCode must contain only alphanumeric characters, dashes, or underscores.',
  })
  inviteTemplateCode?: string;
}
