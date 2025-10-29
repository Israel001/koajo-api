import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray } from 'class-validator';
import { IsUUID } from 'class-validator';

export class SetAdminUserRolesDto {
  @ApiProperty({ description: 'Complete list of role identifiers assigned to the admin.', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
