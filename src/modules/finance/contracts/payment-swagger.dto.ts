import { ApiProperty } from '@nestjs/swagger';
import { RecordPaymentResult, RecordPayoutResult } from './payment-results';
import type {
  PaymentListResult,
  PaymentSummary,
  PayoutListResult,
  PayoutSummary,
  TransactionListResult,
  TransactionSummary,
} from './payment-summary';

export class RecordPaymentResultDto implements RecordPaymentResult {
  @ApiProperty({
    description: 'Recorded payment identifier.',
    example: 'paym_123',
  })
  paymentId!: string;

  @ApiProperty({
    description: 'Transaction identifier linked to this payment.',
    example: 'txn_456',
  })
  transactionId!: string;

  @ApiProperty({
    description: 'Pod membership identifier for the contributor.',
    example: 'membership-uuid',
  })
  membershipId!: string;

  @ApiProperty({
    description: 'Pod identifier associated with the payment.',
    example: 'pod-uuid',
  })
  podId!: string;

  @ApiProperty({
    description: 'Payment amount in major currency units.',
    example: '5000.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'Currency code for the payment.',
    example: 'NGN',
  })
  currency!: string;

  @ApiProperty({
    description: 'Status string for the recorded payment.',
    example: 'succeeded',
  })
  status!: string;

  @ApiProperty({
    description: 'Stripe reference identifier for the payment.',
    example: 'pi_1QB2m4Fo222Y9bAd3S',
  })
  stripeReference!: string;

  @ApiProperty({
    description:
      'Total contribution accumulated for the membership after this payment.',
    example: '5000.00',
  })
  totalContributed!: string;
}

export class RecordPayoutResultDto implements RecordPayoutResult {
  @ApiProperty({
    description: 'Recorded payout identifier.',
    example: 'pout_123',
  })
  payoutId!: string;

  @ApiProperty({
    description: 'Transaction identifier linked to this payout.',
    example: 'txn_789',
  })
  transactionId!: string;

  @ApiProperty({
    description: 'Pod membership identifier for the recipient.',
    example: 'membership-uuid',
  })
  membershipId!: string;

  @ApiProperty({
    description: 'Pod identifier associated with the payout.',
    example: 'pod-uuid',
  })
  podId!: string;

  @ApiProperty({
    description: 'Payout amount in major currency units.',
    example: '5000.00',
  })
  amount!: string;

  @ApiProperty({ description: 'Currency code for the payout.', example: 'NGN' })
  currency!: string;

  @ApiProperty({
    description: 'Status string for the recorded payout.',
    example: 'paid',
  })
  status!: string;

  @ApiProperty({
    description: 'Stripe reference identifier for the payout.',
    example: 'po_1QB2m4Fo222Y9bAd3S',
  })
  stripeReference!: string;

  @ApiProperty({
    description: 'Fee deducted from the payout.',
    example: '100.00',
  })
  fee!: string;

  @ApiProperty({
    description:
      'Indicates whether the membership was marked as completed due to this payout.',
    example: true,
  })
  membershipCompleted!: boolean;
}

export class PaymentSummaryDto implements PaymentSummary {
  @ApiProperty({
    description: 'Recorded payment identifier.',
    example: 'paym_123',
  })
  id!: string;

  @ApiProperty({
    description: 'Pod membership identifier for the contributor.',
    example: 'membership-uuid',
  })
  membershipId!: string;

  @ApiProperty({
    description: 'Pod identifier associated with the payment.',
    example: 'pod-uuid',
  })
  podId!: string;

  @ApiProperty({
    description: 'Friendly pod name if available.',
    nullable: true,
  })
  podName!: string | null;

  @ApiProperty({
    description: 'Pod plan code associated with the payment.',
    example: 'SAVER_WEEKLY',
  })
  podPlanCode!: string;

  @ApiProperty({
    description: 'Payment amount in major currency units.',
    example: '5000.00',
  })
  amount!: string;

  @ApiProperty({
    description: 'Currency code for the payment.',
    example: 'NGN',
  })
  currency!: string;

  @ApiProperty({
    description: 'Status string for the recorded payment.',
    example: 'succeeded',
  })
  status!: string;

  @ApiProperty({
    description: 'Stripe reference identifier for the payment.',
    example: 'pi_1QB2m4Fo222Y9bAd3S',
  })
  stripeReference!: string;

  @ApiProperty({
    description: 'Description attached to the payment, if any.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the payment was recorded.',
  })
  recordedAt!: string;
}

export class PaymentListResultDto implements PaymentListResult {
  @ApiProperty({
    description: 'Total number of payments that match the query.',
  })
  total!: number;

  @ApiProperty({
    description: 'Payments for the requested page.',
    type: [PaymentSummaryDto],
  })
  items!: PaymentSummaryDto[];
}

export class PayoutSummaryDto implements PayoutSummary {
  @ApiProperty({ description: 'Recorded payout identifier.' })
  id!: string;

  @ApiProperty({ description: 'Pod membership identifier for the recipient.' })
  membershipId!: string;

  @ApiProperty({ description: 'Pod identifier associated with the payout.' })
  podId!: string;

  @ApiProperty({ description: 'Friendly pod name if available.', nullable: true })
  podName!: string | null;

  @ApiProperty({ description: 'Pod plan code associated with the payout.' })
  podPlanCode!: string;

  @ApiProperty({ description: 'Payout amount in major currency units.' })
  amount!: string;

  @ApiProperty({ description: 'Fee deducted from the payout.' })
  fee!: string;

  @ApiProperty({ description: 'Currency code for the payout.' })
  currency!: string;

  @ApiProperty({ description: 'Status string for the recorded payout.' })
  status!: string;

  @ApiProperty({ description: 'Stripe reference identifier for the payout.' })
  stripeReference!: string;

  @ApiProperty({ description: 'Description attached to the payout, if any.', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'ISO 8601 timestamp when the payout was recorded.' })
  recordedAt!: string;

  @ApiProperty({ description: 'ISO 8601 payout date for the membership, if available.', nullable: true })
  payoutDate!: string | null;
}

export class PayoutListResultDto implements PayoutListResult {
  @ApiProperty({ description: 'Total number of payouts that match the query.' })
  total!: number;

  @ApiProperty({
    description: 'Payouts for the requested page.',
    type: [PayoutSummaryDto],
  })
  items!: PayoutSummaryDto[];
}

export class TransactionSummaryDto implements TransactionSummary {
  @ApiProperty({ description: 'Transaction identifier.' })
  id!: string;

  @ApiProperty({ description: 'Transaction type.', enum: ['payment', 'payout'] })
  type!: 'payment' | 'payout';

  @ApiProperty({ description: 'Pod membership identifier for the transaction.' })
  membershipId!: string;

  @ApiProperty({ description: 'Pod identifier associated with the transaction.' })
  podId!: string;

  @ApiProperty({ description: 'Friendly pod name if available.', nullable: true })
  podName!: string | null;

  @ApiProperty({ description: 'Pod plan code associated with the transaction.' })
  podPlanCode!: string;

  @ApiProperty({ description: 'Transaction amount in major currency units.' })
  amount!: string;

  @ApiProperty({ description: 'Fee applied to the transaction, if any.', nullable: true })
  fee!: string | null;

  @ApiProperty({ description: 'Currency code for the transaction.' })
  currency!: string;

  @ApiProperty({ description: 'Status string for the recorded transaction.' })
  status!: string;

  @ApiProperty({ description: 'Stripe reference identifier for the transaction.' })
  stripeReference!: string;

  @ApiProperty({ description: 'Description attached to the transaction, if any.', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'ISO 8601 timestamp when the transaction was recorded.' })
  recordedAt!: string;

  @ApiProperty({ description: 'ISO 8601 payout date for the membership, if available.', nullable: true })
  payoutDate!: string | null;
}

export class TransactionListResultDto implements TransactionListResult {
  @ApiProperty({ description: 'Total number of transactions that match the query.' })
  total!: number;

  @ApiProperty({
    description: 'Transactions for the requested page.',
    type: [TransactionSummaryDto],
  })
  items!: TransactionSummaryDto[];
}
