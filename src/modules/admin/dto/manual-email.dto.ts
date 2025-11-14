import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ManualEmailRecipientDto {
  @ApiProperty({ description: 'Email address that should receive the template.' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description:
      'Template variable values for this recipient. Include all keys required by the template definition.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number>;
}

export class SendManualEmailDto {
  @ApiProperty({
    description: 'Identifier of the manual email template to send.',
  })
  @IsString()
  @IsNotEmpty()
  templateCode!: string;

  @ApiPropertyOptional({
    description: 'Optional subject override. Defaults to the template subject.',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description:
      'Recipients that should receive the template. Provide variable values per recipient as an array of objects.',
    type: [ManualEmailRecipientDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualEmailRecipientDto)
  recipients!: ManualEmailRecipientDto[];
}
