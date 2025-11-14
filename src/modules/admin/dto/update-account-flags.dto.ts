import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAccountFlagsDto {
  @ApiPropertyOptional({
    description: 'When provided, toggles the fraud review flag for the account.',
  })
  @IsOptional()
  @IsBoolean()
  fraudReview?: boolean;

  @ApiPropertyOptional({
    description: 'When provided, toggles the missed payment flag for the account.',
  })
  @IsOptional()
  @IsBoolean()
  missedPayment?: boolean;

  @ApiPropertyOptional({
    description: 'When provided, toggles the overheat flag (rapid pod joins) for the account.',
  })
  @IsOptional()
  @IsBoolean()
  overheat?: boolean;
}
