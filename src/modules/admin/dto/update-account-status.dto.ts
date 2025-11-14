import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateAccountStatusDto {
  @ApiProperty({
    description:
      'Desired active state for the customer account. Set to false to deactivate.',
  })
  @IsBoolean()
  isActive!: boolean;
}
