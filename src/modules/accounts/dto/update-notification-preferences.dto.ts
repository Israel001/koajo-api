import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Enable or disable general system emails.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable or disable transaction-related emails.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  transactionNotificationsEnabled?: boolean;
}
