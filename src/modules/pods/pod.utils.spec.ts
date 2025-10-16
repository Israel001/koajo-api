import {
  CustomPodCadence,
} from './custom-pod-cadence.enum';
import {
  generateCustomPayoutSchedule,
  isWithinContributionWindow,
  resolveContributionWindowStart,
} from './pod.utils';

describe('pod.utils custom cadence helpers', () => {
  describe('isWithinContributionWindow', () => {
    it('detects windows for monthly cadence', () => {
      expect(
        isWithinContributionWindow(new Date(Date.UTC(2025, 0, 2)), CustomPodCadence.MONTHLY),
      ).toBe(true);
      expect(
        isWithinContributionWindow(new Date(Date.UTC(2025, 0, 10)), CustomPodCadence.MONTHLY),
      ).toBe(false);
    });

    it('detects windows for bi-weekly cadence', () => {
      expect(
        isWithinContributionWindow(new Date(Date.UTC(2025, 0, 17)), CustomPodCadence.BI_WEEKLY),
      ).toBe(true);
      expect(
        isWithinContributionWindow(new Date(Date.UTC(2025, 0, 20)), CustomPodCadence.BI_WEEKLY),
      ).toBe(false);
    });
  });

  describe('resolveContributionWindowStart', () => {
    it('returns current month start for monthly cadence', () => {
      const anchor = resolveContributionWindowStart(
        new Date(Date.UTC(2025, 4, 2)),
        CustomPodCadence.MONTHLY,
      );
      expect(anchor.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    });

    it('returns next window for bi-weekly cadence outside window', () => {
      const anchor = resolveContributionWindowStart(
        new Date(Date.UTC(2025, 0, 10)),
        CustomPodCadence.BI_WEEKLY,
      );
      expect(anchor.toISOString()).toBe('2025-01-16T00:00:00.000Z');
    });
  });

  describe('generateCustomPayoutSchedule', () => {
    it('generates alternating 15/30 schedule for bi-weekly cadence', () => {
      const schedule = generateCustomPayoutSchedule(
        CustomPodCadence.BI_WEEKLY,
        new Date(Date.UTC(2025, 0, 1)),
        3,
      );
      expect(schedule.map((date) => date.toISOString())).toEqual([
        '2025-01-15T00:00:00.000Z',
        '2025-01-30T00:00:00.000Z',
        '2025-02-15T00:00:00.000Z',
      ]);
    });

    it('handles shorter months for monthly cadence', () => {
      const schedule = generateCustomPayoutSchedule(
        CustomPodCadence.MONTHLY,
        new Date(Date.UTC(2025, 0, 1)),
        3,
      );
      expect(schedule.map((date) => date.toISOString())).toEqual([
        '2025-01-30T00:00:00.000Z',
        '2025-02-28T00:00:00.000Z',
        '2025-03-30T00:00:00.000Z',
      ]);
    });
  });
});
