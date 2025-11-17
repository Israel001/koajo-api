import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

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

  @ApiProperty({
    name: 'account_last4',
    description: 'Last four digits of the linked bank account.',
  })
  @Expose({ name: 'account_last4' })
  @IsString()
  @Length(4, 4)
  accountLast4!: string;

  @ApiProperty({
    name: 'payment_method_id',
    description: 'Stripe payment method identifier to use for debits.',
  })
  @Expose({ name: 'payment_method_id' })
  @IsString()
  @IsNotEmpty()
  paymentMethodId!: string;
}
