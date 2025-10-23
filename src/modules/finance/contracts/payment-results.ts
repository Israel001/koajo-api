export interface RecordPaymentResult {
  paymentId: string;
  transactionId: string;
  membershipId: string;
  podId: string;
  amount: string;
  currency: string;
  status: string;
  stripeReference: string;
  totalContributed: string;
}

export interface RecordPayoutResult {
  payoutId: string;
  transactionId: string;
  membershipId: string;
  podId: string;
  amount: string;
  currency: string;
  status: string;
  stripeReference: string;
  fee: string;
  membershipCompleted: boolean;
}
