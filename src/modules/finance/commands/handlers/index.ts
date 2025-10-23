import { RecordPaymentHandler } from './record-payment.handler';
import { RecordPayoutHandler } from './record-payout.handler';

export const FinanceCommandHandlers = [
  RecordPaymentHandler,
  RecordPayoutHandler,
];

export { RecordPaymentHandler } from './record-payment.handler';
export { RecordPayoutHandler } from './record-payout.handler';
