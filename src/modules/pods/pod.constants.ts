import { PodStatus } from './pod-status.enum';

export interface PodPlanDefinition {
  code: string;
  amount: number;
  lifecycleWeeks: number;
  maxMembers: number;
  active: boolean;
}

const AMOUNTS = [100, 200, 500, 1000];

export const DEFAULT_POD_PLANS: PodPlanDefinition[] = AMOUNTS.flatMap((amount) => [
  {
    code: `${amount}-12`,
    amount,
    lifecycleWeeks: 12,
    maxMembers: 6,
    active: true,
  },
  {
    code: `${amount}-24`,
    amount,
    lifecycleWeeks: 24,
    maxMembers: 12,
    active: true,
  },
]);

export const POD_START_DAYS = [1, 16];
export const POD_PAYOUT_DAYS = [15, 30];
export const POD_GRACE_PERIOD_DAYS = 2; // inclusive, so locking occurs on start day + 2
export const POD_OPEN_STATUSES: PodStatus[] = [PodStatus.OPEN, PodStatus.GRACE];
