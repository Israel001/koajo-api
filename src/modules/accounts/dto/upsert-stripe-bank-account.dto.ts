import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpsertStripeBankAccountDto {
  @ApiProperty({
    name: 'id',
    description: 'Stripe bank account identifier.',
  })
  @Expose({ name: 'id' })
  @IsString()
  @IsNotEmpty()
  bankAccountId!: string;

  @ApiProperty({
    name: 'customer_id',
    description: 'Stripe customer identifier associated with the bank account.',
  })
  @Expose({ name: 'customer_id' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;
}
