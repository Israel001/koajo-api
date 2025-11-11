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

  @ApiProperty({
    name: 'bank_name',
    description: 'Name of the financial institution for the bank account.',
  })
  @Expose({ name: 'bank_name' })
  @IsString()
  @IsNotEmpty()
  bankName!: string;

  @ApiProperty({
    name: 'account_first_name',
    description: 'First name associated with the bank account.',
  })
  @Expose({ name: 'account_first_name' })
  @IsString()
  @IsNotEmpty()
  accountFirstName!: string;

  @ApiProperty({
    name: 'account_last_name',
    description: 'Last name associated with the bank account.',
  })
  @Expose({ name: 'account_last_name' })
  @IsString()
  @IsNotEmpty()
  accountLastName!: string;
}
