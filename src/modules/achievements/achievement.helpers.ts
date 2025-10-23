import { CustomPodCadence } from '../pods/custom-pod-cadence.enum';
import { PodType } from '../pods/pod-type.enum';
import { PodMembershipEntity } from '../pods/entities/pod-membership.entity';
import { PodEntity } from '../pods/entities/pod.entity';
import { addDays, resolveContributionWindowStart, startOfDay } from '../pods/pod.utils';

const PAYMENT_SUCCESS_STATUSES = new Set([
  'paid',
  'succeeded',
  'completed',
  'success',
]);

export const WEALTH_BUILDER_THRESHOLD_UNITS = 5000 * 100;
export const SAVINGS_CHAMPION_THRESHOLD_UNITS = 20000 * 100;
export const SIX_FIGURES_THRESHOLD_UNITS = 100000 * 100;
export const PERFECT_STREAK_MIN_MONTHS = 3;

const CONTRIBUTION_WINDOW_DAYS = 3;
const BI_WEEKLY_SPAN_DAYS = 15;
const SYSTEM_CONTRIBUTION_INTERVAL_DAYS = 14;

export interface PaymentLike {
  amount: string;
  status: string;
  createdAt: Date;
  membership?: PodMembershipEntity | null;
}

const normalizeStatus = (status: string): string => status.trim().toLowerCase();

export const isSuccessfulPaymentStatus = (status: string): boolean => {
  return PAYMENT_SUCCESS_STATUSES.has(normalizeStatus(status));
};

export const toMinorUnits = (value: number | string): number => {
  const numeric =
    typeof value === 'number' ? value : Number.parseFloat(value ?? '0');
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
};

export const expectedContributionCount = (
  membership: PodMembershipEntity,
): number => {
  const pod = membership.pod as PodEntity | undefined;
  if (!pod) {
    return 0;
  }

  if (pod.type === PodType.CUSTOM) {
    const expected = pod.expectedMemberCount ?? pod.maxMembers ?? 0;
    return Math.max(expected, 0);
  }

  const lifecycleWeeks = Math.max(pod.lifecycleWeeks ?? 0, 0);
  const cycles = Math.ceil(lifecycleWeeks / 2);
  return Math.max(cycles, 0);
};

const addMonthsUtc = (reference: Date, months: number): Date => {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const day = reference.getUTCDate();
  return new Date(Date.UTC(year, month + months, day, 0, 0, 0, 0));
};

const contributionWindowsForPod = (
  pod: PodEntity,
  count: number,
): Array<{ start: Date; end: Date }> => {
  if (count <= 0) {
    return [];
  }

  const start = pod.startDate ?? pod.scheduledStartDate;
  if (!start) {
    return [];
  }

  const base = startOfDay(start);
  const windows: Array<{ start: Date; end: Date }> = [];

  const pushWindow = (anchor: Date) => {
    const windowStart = startOfDay(anchor);
    const windowEnd = addDays(windowStart, CONTRIBUTION_WINDOW_DAYS - 1);
    windows.push({ start: windowStart, end: windowEnd });
  };

  if (pod.type === PodType.CUSTOM && pod.cadence) {
    let cursor = resolveContributionWindowStart(base, pod.cadence);
    for (let index = 0; index < count; index += 1) {
      pushWindow(cursor);

      if (pod.cadence === CustomPodCadence.MONTHLY) {
        const nextMonth = addMonthsUtc(cursor, 1);
        cursor = resolveContributionWindowStart(nextMonth, pod.cadence);
      } else {
        const advance = addDays(cursor, BI_WEEKLY_SPAN_DAYS);
        cursor = resolveContributionWindowStart(advance, pod.cadence);
      }
    }
    return windows;
  }

  let cursor = base;
  for (let index = 0; index < count; index += 1) {
    pushWindow(cursor);
    cursor = addDays(cursor, SYSTEM_CONTRIBUTION_INTERVAL_DAYS);
  }

  return windows;
};

export const completedWithoutMissingContributions = (
  membership: PodMembershipEntity,
  payments: PaymentLike[],
): boolean => {
  const pod = membership.pod;
  if (!pod) {
    return false;
  }

  const expectedCount = expectedContributionCount(membership);
  if (expectedCount <= 0) {
    return false;
  }

  const unitAmount = toMinorUnits(pod.amount ?? 0);
  if (unitAmount <= 0) {
    return false;
  }

  const successful = payments.filter((payment) =>
    isSuccessfulPaymentStatus(payment.status),
  );

  if (successful.length < expectedCount) {
    return false;
  }

  const totalUnits = successful.reduce(
    (acc, item) => acc + toMinorUnits(item.amount),
    0,
  );

  return totalUnits >= unitAmount * expectedCount;
};

export const completedOnTime = (
  membership: PodMembershipEntity,
  payments: PaymentLike[],
): boolean => {
  const pod = membership.pod;
  if (!pod) {
    return false;
  }

  const expectedCount = expectedContributionCount(membership);
  if (expectedCount <= 0) {
    return false;
  }

  const windows = contributionWindowsForPod(pod, expectedCount);
  if (windows.length !== expectedCount) {
    return false;
  }

  const successful = payments
    .filter((payment) => isSuccessfulPaymentStatus(payment.status))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (successful.length < expectedCount) {
    return false;
  }

  for (let index = 0; index < expectedCount; index += 1) {
    const payment = successful[index];
    const window = windows[index];
    const timestamp = payment.createdAt.getTime();

    if (timestamp > window.end.getTime()) {
      return false;
    }
  }

  return true;
};

export const sumSuccessfulContributions = (payments: PaymentLike[]): number => {
  return payments
    .filter((payment) => isSuccessfulPaymentStatus(payment.status))
    .reduce((acc, payment) => acc + toMinorUnits(payment.amount), 0);
};

export const computeLongestMonthlyStreak = (
  payments: PaymentLike[],
): number => {
  const successful = payments.filter((payment) =>
    isSuccessfulPaymentStatus(payment.status),
  );

  const uniqueMonths = new Set<number>();

  successful.forEach((payment) => {
    const date = payment.createdAt;
    const key = date.getUTCFullYear() * 12 + date.getUTCMonth();
    uniqueMonths.add(key);
  });

  const sequence = Array.from(uniqueMonths).sort((a, b) => a - b);

  let longest = 0;
  let current = 0;
  let previous: number | null = null;

  sequence.forEach((value) => {
    if (previous === null || value === previous + 1) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) {
      longest = current;
    }
    previous = value;
  });

  return longest;
};
