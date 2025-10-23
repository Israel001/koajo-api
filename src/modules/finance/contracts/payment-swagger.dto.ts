import { ApiProperty } from '@nestjs/swagger';
import {
  RecordPaymentResult,
  RecordPayoutResult,
} from './payment-results';

export class RecordPaymentResultDto implements RecordPaymentResult {
  @ApiProperty({ description: 'Recorded payment identifier.', example: 'paym_123' })
  paymentId!: string;

  @ApiProperty({ description: 'Transaction identifier linked to this payment.', example: 'txn_456' })
  transactionId!: string;

  @ApiProperty({ description: 'Pod membership identifier for the contributor.', example: 'membership-uuid' })
  membershipId!: string;

  @ApiProperty({ description: 'Pod identifier associated with the payment.', example: 'pod-uuid' })
  podId!: string;

  @ApiProperty({ description: 'Payment amount in major currency units.', example: '5000.00' })
  amount!: string;

  @ApiProperty({ description: 'Currency code for the payment.', example: 'NGN' })
  currency!: string;

  @ApiProperty({ description: 'Status string for the recorded payment.', example: 'succeeded' })
  status!: string;

  @ApiProperty({ description: 'Stripe reference identifier for the payment.', example: 'pi_1QB2m4Fo222Y9bAd3S' })
  stripeReference!: string;

  @ApiProperty({ description: 'Total contribution accumulated for the membership after this payment.', example: '5000.00' })
  totalContributed!: string;
}

export class RecordPayoutResultDto implements RecordPayoutResult {
  @ApiProperty({ description: 'Recorded payout identifier.', example: 'pout_123' })
  payoutId!: string;

  @ApiProperty({ description: 'Transaction identifier linked to this payout.', example: 'txn_789' })
  transactionId!: string;

  @ApiProperty({ description: 'Pod membership identifier for the recipient.', example: 'membership-uuid' })
  membershipId!: string;

  @ApiProperty({ description: 'Pod identifier associated with the payout.', example: 'pod-uuid' })
  podId!: string;

  @ApiProperty({ description: 'Payout amount in major currency units.', example: '5000.00' })
  amount!: string;

  @ApiProperty({ description: 'Currency code for the payout.', example: 'NGN' })
  currency!: string;

  @ApiProperty({ description: 'Status string for the recorded payout.', example: 'paid' })
  status!: string;

  @ApiProperty({ description: 'Stripe reference identifier for the payout.', example: 'po_1QB2m4Fo222Y9bAd3S' })
  stripeReference!: string;

  @ApiProperty({ description: 'Fee deducted from the payout.', example: '100.00' })
  fee!: string;

  @ApiProperty({ description: 'Indicates whether the membership was marked as completed due to this payout.', example: true })
  membershipCompleted!: boolean;
}
