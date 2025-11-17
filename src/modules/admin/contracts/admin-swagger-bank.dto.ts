import { ApiProperty } from '@nestjs/swagger';
import { AdminAccountBankDetails } from './admin-results';

export class AdminAccountBankDetailsDto implements AdminAccountBankDetails {
  @ApiProperty({ description: 'Bank name.', nullable: true })
  bankName!: string | null;

  @ApiProperty({ description: 'Stripe payment method id.', nullable: true })
  paymentMethodId!: string | null;

  @ApiProperty({ description: 'Last 4 of bank account.', nullable: true })
  accountLast4!: string | null;

  @ApiProperty({ description: 'Stripe customer id.', nullable: true })
  customerId!: string | null;

  @ApiProperty({ description: 'Stripe bank account id.', nullable: true })
  bankAccountId!: string | null;

  @ApiProperty({ description: 'When the bank account was linked.', nullable: true })
  linkedAt!: string | null;

  @ApiProperty({ description: 'When the bank account was last updated.', nullable: true })
  updatedAt!: string | null;
}
