import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ArrayNotEmpty,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

export class CreateAnnouncementDto {
  @ApiProperty({ enum: AnnouncementChannel, description: 'Delivery channel for the announcement.' })
  @IsEnum(AnnouncementChannel)
  channel!: AnnouncementChannel;

  @ApiProperty({ description: 'Descriptive name for the announcement.' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Title used when rendering notifications.' })
  @IsString()
  @IsNotEmpty()
  notificationTitle!: string;

  @ApiProperty({ description: 'Announcement message body.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ enum: AnnouncementSeverity, description: 'Severity level for the announcement.' })
  @IsEnum(AnnouncementSeverity)
  severity!: AnnouncementSeverity;

  @ApiPropertyOptional({ description: 'Optional action URL associated with the announcement.' })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'actionUrl must be a valid URL' })
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Optional image URL to attach to the announcement.' })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @ApiProperty({ description: 'Indicates whether the announcement targets every user.' })
  @IsBoolean()
  sendToAll!: boolean;

  @ApiPropertyOptional({
    description: 'Specific account identifiers to receive the announcement when sendToAll is false.',
    type: [String],
  })
  @ValidateIf((dto: CreateAnnouncementDto) => dto.sendToAll === false)
  @IsArray()
  @ArrayNotEmpty()
  accountIds?: string[];
}
