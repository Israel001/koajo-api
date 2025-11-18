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
