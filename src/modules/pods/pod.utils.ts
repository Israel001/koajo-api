import { CustomPodCadence } from './custom-pod-cadence.enum';

export const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * MILLIS_IN_DAY);
};

export const startOfDay = (date: Date): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
};

export const computeNextStartDate = (from: Date): Date => {
  const reference = startOfDay(from);
  const day = reference.getUTCDate();
  const month = reference.getUTCMonth();
  const year = reference.getUTCFullYear();

  if (day <= 1) {
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }

  if (day <= 16) {
    return new Date(Date.UTC(year, month, 16, 0, 0, 0, 0));
  }

  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
};

export const nextStartWindow = (after: Date): Date => {
  const reference = addDays(startOfDay(after), 1);
  return computeNextStartDate(reference);
};

export const generatePayoutSchedule = (
  startDate: Date,
  slotCount: number,
): Date[] => {
  const schedule: Date[] = [];
  const cursor = startOfDay(startDate);

  const advance = (date: Date) => {
    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();

    if (day < 15) {
      return new Date(Date.UTC(year, month, 15, 0, 0, 0, 0));
    }

    if (day < 30) {
      return new Date(Date.UTC(year, month, 30, 0, 0, 0, 0));
    }

    return new Date(Date.UTC(year, month + 1, 15, 0, 0, 0, 0));
  };

  let next = advance(cursor);

  for (let i = 0; i < slotCount; i += 1) {
    schedule.push(next);
    next = advance(next);
  }

  return schedule;
};

export const shuffle = <T>(items: T[]): T[] => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const daysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0)).getUTCDate();
};

const dateWithDay = (year: number, month: number, day: number): Date => {
  const validDay = Math.min(day, daysInMonth(year, month));
  return new Date(Date.UTC(year, month, validDay, 0, 0, 0, 0));
};

const isWithinRange = (day: number, start: number, end: number): boolean => {
  return day >= start && day <= end;
};

export const isWithinContributionWindow = (
  date: Date,
  cadence: CustomPodCadence,
): boolean => {
  const day = date.getUTCDate();
  if (cadence === CustomPodCadence.MONTHLY) {
    return isWithinRange(day, 1, 3);
  }

  return isWithinRange(day, 1, 3) || isWithinRange(day, 16, 18);
};

export const resolveContributionWindowStart = (
  date: Date,
  cadence: CustomPodCadence,
): Date => {
  const reference = startOfDay(date);
  const day = reference.getUTCDate();
  const month = reference.getUTCMonth();
  const year = reference.getUTCFullYear();

  if (cadence === CustomPodCadence.MONTHLY) {
    if (day <= 3) {
      return dateWithDay(year, month, 1);
    }
    return dateWithDay(year, month + 1, 1);
  }

  if (day <= 3) {
    return dateWithDay(year, month, 1);
  }

  if (day <= 18) {
    return dateWithDay(year, month, 16);
  }

  return dateWithDay(year, month + 1, 1);
};

export const computeNextPayoutAnchor = (
  contributionStart: Date,
  cadence: CustomPodCadence,
): Date => {
  const start = startOfDay(contributionStart);
  const day = start.getUTCDate();
  const month = start.getUTCMonth();
  const year = start.getUTCFullYear();

  if (cadence === CustomPodCadence.MONTHLY) {
    return dateWithDay(year, month, 30);
  }

  if (isWithinRange(day, 1, 3)) {
    return dateWithDay(year, month, 15);
  }

  if (isWithinRange(day, 16, 18)) {
    return dateWithDay(year, month, 30);
  }

  // fallback to next contribution window
  const nextWindow = resolveContributionWindowStart(addDays(start, 1), cadence);
  return computeNextPayoutAnchor(nextWindow, cadence);
};

export const nextContributionWindowStart = (
  currentWindowStart: Date,
  cadence: CustomPodCadence,
): Date => {
  const base = startOfDay(currentWindowStart);

  if (cadence === CustomPodCadence.MONTHLY) {
    const nextMonthSeed = addDays(base, 32);
    return resolveContributionWindowStart(nextMonthSeed, cadence);
  }

  // bi-weekly / semi-monthly cadence
  const nextSeed = addDays(base, 17);
  return resolveContributionWindowStart(nextSeed, cadence);
};

export const generateCustomPayoutSchedule = (
  cadence: CustomPodCadence,
  contributionStart: Date,
  slotCount: number,
): Date[] => {
  const schedule: Date[] = [];
  if (slotCount <= 0) {
    return schedule;
  }

  if (cadence === CustomPodCadence.MONTHLY) {
    let cursor = computeNextPayoutAnchor(contributionStart, cadence);
    for (let index = 0; index < slotCount; index += 1) {
      schedule.push(cursor);
      const year = cursor.getUTCFullYear();
      const month = cursor.getUTCMonth();
      cursor = dateWithDay(year, month + 1, 30);
    }
    return schedule;
  }

  const cursor = generatePayoutSchedule(contributionStart, 1)[0];
  schedule.push(cursor);

  for (let index = 1; index < slotCount; index += 1) {
    const previous = schedule[index - 1];
    const year = previous.getUTCFullYear();
    const month = previous.getUTCMonth();
    const day = previous.getUTCDate();
    if (day === 15) {
      schedule.push(dateWithDay(year, month, 30));
    } else {
      schedule.push(dateWithDay(year, month + 1, 15));
    }
  }

  return schedule;
};
