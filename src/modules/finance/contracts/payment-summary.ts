export interface PaymentSummary {
  id: string;
  membershipId: string;
  podId: string;
  podName: string | null;
  podPlanCode: string;
  amount: string;
  currency: string;
  status: string;
  stripeReference: string;
  description: string | null;
  recordedAt: string;
}

export interface PaymentListResult {
  total: number;
  items: PaymentSummary[];
}

export interface PayoutSummary {
  id: string;
  membershipId: string;
  podId: string;
  podName: string | null;
  podPlanCode: string;
  amount: string;
  fee: string;
  currency: string;
  status: string;
  stripeReference: string;
  description: string | null;
  recordedAt: string;
  payoutDate: string | null;
}

export interface PayoutListResult {
  total: number;
  items: PayoutSummary[];
}

export type TransactionKind = 'payment' | 'payout';

export interface TransactionSummary {
  id: string;
  type: TransactionKind;
  membershipId: string;
  podId: string;
  podName: string | null;
  podPlanCode: string;
  amount: string;
  fee: string | null;
  currency: string;
  status: string;
  stripeReference: string;
  description: string | null;
  recordedAt: string;
  payoutDate: string | null;
}

export interface TransactionListResult {
  total: number;
  items: TransactionSummary[];
}
