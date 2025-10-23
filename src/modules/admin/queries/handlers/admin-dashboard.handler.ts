import { raw } from '@mikro-orm/core';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminDashboardQuery } from '../admin-dashboard.query';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import {
  AdminDashboardMetrics,
  AdminDashboardResult,
  MetricWithChange,
} from '../../contracts/admin-results';
import { PaymentEntity } from '../../../finance/entities/payment.entity';
import { PayoutEntity } from '../../../finance/entities/payout.entity';
import { TransactionEntity } from '../../../finance/entities/transaction.entity';
import { PodPlanEntity } from '../../../pods/entities/pod-plan.entity';
import { AccountVerificationAttemptEntity } from '../../../accounts/entities/account-verification-attempt.entity';
import { TransactionType } from '../../../finance/transaction-type.enum';

@QueryHandler(AdminDashboardQuery)
export class AdminDashboardHandler
  implements IQueryHandler<AdminDashboardQuery, AdminDashboardResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
    @InjectRepository(PodPlanEntity)
    private readonly podPlanRepository: EntityRepository<PodPlanEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
  ) {}

  async execute(_: AdminDashboardQuery): Promise<AdminDashboardResult> {
    const now = new Date();
    const startOfToday = this.startOfDay(now);
    const startOfYesterday = this.addDays(startOfToday, -1);
    const startOfTomorrow = this.addDays(startOfToday, 1);
    const startOfMonth = this.startOfMonth(now);
    const startOfNextMonth = this.addMonths(startOfMonth, 1);
    const startOfPreviousMonth = this.addMonths(startOfMonth, -1);
    const startOfTwoMonthsAgo = this.addMonths(startOfMonth, -2);

    const [
      totalActiveUsers,
      previousActiveUsers,
      newSignupsToday,
      newSignupsYesterday,
      dailyGrowthMetrics,
      monthlyGrowthMetrics,
      incomeAnalysis,
      payoutAnalysis,
      podContributions,
      kycSummary,
      recentTransactions,
    ] = await Promise.all([
      this.accountRepository.count({ isActive: true }),
      this.accountRepository.count({
        isActive: true,
        updatedAt: { $lt: startOfToday },
      }),
      this.accountRepository.count({
        createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      this.accountRepository.count({
        createdAt: { $gte: startOfYesterday, $lt: startOfToday },
      }),
      this.computeDailyGrowth(startOfToday),
      this.computeMonthlyGrowth(startOfMonth, startOfNextMonth),
      this.computeIncomeAnalysis(
        startOfMonth,
        startOfNextMonth,
        startOfPreviousMonth,
        startOfTwoMonthsAgo,
      ),
      this.computePayoutAnalysis(
        startOfMonth,
        startOfNextMonth,
        startOfPreviousMonth,
        startOfTwoMonthsAgo,
      ),
      this.computePodContributions(),
      this.computeKycSummary(),
      this.computeRecentTransactions(),
    ]);

    const metrics: AdminDashboardMetrics = {
      totalActiveUsers: {
        value: totalActiveUsers,
        percentageChange: this.percentageChange(
          totalActiveUsers,
          previousActiveUsers,
        ),
      },
      newSignupsToday: {
        value: newSignupsToday,
        percentageChange: this.percentageChange(
          newSignupsToday,
          newSignupsYesterday,
        ),
      },
      averageDailyUserGrowth: dailyGrowthMetrics,
      averageMonthlyUserGrowth: monthlyGrowthMetrics,
    };

    return {
      metrics,
      incomeAnalysis,
      payoutAnalysis,
      podContributions,
      kycSummary,
      recentTransactions,
    };
  }

  private async computeDailyGrowth(
    startOfToday: Date,
  ): Promise<MetricWithChange<number>> {
    const fourteenDaysAgo = this.addDays(startOfToday, -13);
    const rows = (await this.accountRepository
      .createQueryBuilder('account')
      .select([raw('account.created_at as createdAt')])
      .where({ createdAt: { $gte: fourteenDaysAgo } })
      .orderBy({ createdAt: 'ASC' })
      .execute('all')) as Array<{ createdAt?: Date | string }>;

    const dailyBuckets = new Map<string, number>();
    rows.forEach((row) => {
      const createdAt =
        row.createdAt instanceof Date
          ? row.createdAt
          : row.createdAt
            ? new Date(row.createdAt)
            : null;
      if (!createdAt) {
        return;
      }
      const key = this.toDayKey(createdAt);
      dailyBuckets.set(key, (dailyBuckets.get(key) ?? 0) + 1);
    });

    const currentWindowKeys = this.buildSequentialDayKeys(startOfToday, 7);
    const previousWindowKeys = this.buildSequentialDayKeys(
      this.addDays(startOfToday, -7),
      7,
    );

    const currentWindowTotal = currentWindowKeys.reduce(
      (sum, key) => sum + (dailyBuckets.get(key) ?? 0),
      0,
    );
    const previousWindowTotal = previousWindowKeys.reduce(
      (sum, key) => sum + (dailyBuckets.get(key) ?? 0),
      0,
    );

    const currentAverage = currentWindowTotal / currentWindowKeys.length;
    const previousAverage =
      previousWindowKeys.length === 0
        ? 0
        : previousWindowTotal / previousWindowKeys.length;

    return {
      value: this.round(currentAverage),
      percentageChange: this.percentageChange(currentAverage, previousAverage),
    };
  }

  private async computeMonthlyGrowth(
    startOfMonth: Date,
    startOfNextMonth: Date,
  ): Promise<MetricWithChange<number>> {
    const startOfPreviousMonth = this.addMonths(startOfMonth, -1);
    const [currentMonthSignups, previousMonthSignups] = await Promise.all([
      this.accountRepository.count({
        createdAt: { $gte: startOfMonth, $lt: startOfNextMonth },
      }),
      this.accountRepository.count({
        createdAt: { $gte: startOfPreviousMonth, $lt: startOfMonth },
      }),
    ]);

    const daysElapsedInCurrentMonth = this.daysElapsedInclusive(
      startOfMonth,
      new Date(),
    );
    const daysInPreviousMonth = this.daysBetween(
      startOfPreviousMonth,
      startOfMonth,
    );

    const currentAverage = currentMonthSignups / daysElapsedInCurrentMonth;
    const previousAverage = previousMonthSignups / daysInPreviousMonth;

    return {
      value: this.round(currentAverage),
      percentageChange: this.percentageChange(currentAverage, previousAverage),
    };
  }

  private async computeIncomeAnalysis(
    startOfMonth: Date,
    startOfNextMonth: Date,
    startOfPreviousMonth: Date,
    startOfTwoMonthsAgo: Date,
  ) {
    const [currentTotal, previousTotal, lastThreeMonths] = await Promise.all([
      this.sumPaymentsBetween(startOfMonth, startOfNextMonth),
      this.sumPaymentsBetween(startOfPreviousMonth, startOfMonth),
      this.collectMonthlyTotals(this.paymentRepository, [
        startOfTwoMonthsAgo,
        this.addMonths(startOfMonth, -1),
        startOfMonth,
      ]),
    ]);

    return {
      totalIncoming: currentTotal,
      percentageChange: this.percentageChange(
        Number.parseFloat(currentTotal),
        Number.parseFloat(previousTotal),
      ),
      monthlyTotals: lastThreeMonths,
    };
  }

  private async computePayoutAnalysis(
    startOfMonth: Date,
    startOfNextMonth: Date,
    startOfPreviousMonth: Date,
    startOfTwoMonthsAgo: Date,
  ) {
    const [currentTotal, previousTotal, lastThreeMonths] = await Promise.all([
      this.sumPayoutsBetween(startOfMonth, startOfNextMonth),
      this.sumPayoutsBetween(startOfPreviousMonth, startOfMonth),
      this.collectMonthlyTotals(this.payoutRepository, [
        startOfTwoMonthsAgo,
        this.addMonths(startOfMonth, -1),
        startOfMonth,
      ]),
    ]);

    return {
      totalPayouts: currentTotal,
      percentageChange: this.percentageChange(
        Number.parseFloat(currentTotal),
        Number.parseFloat(previousTotal),
      ),
      monthlyTotals: lastThreeMonths,
    };
  }

  private async collectMonthlyTotals<T extends PaymentEntity | PayoutEntity>(
    repository: EntityRepository<T>,
    monthStarts: Date[],
  ) {
    const sortedStarts = monthStarts
      .map((date) => new Date(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const totals = await Promise.all(
      sortedStarts.map((start) => {
        const end = this.addMonths(start, 1);
        return repository
          .createQueryBuilder('record')
          .select([raw('coalesce(sum(record.amount), 0) as total')])
          .where({
            createdAt: { $gte: start, $lt: end },
          })
          .execute()
          .then((rows) => {
            const list = rows as Array<{ total?: string | number }>;
            const total = this.formatAmount(list[0]?.total ?? '0');
            return {
              month: this.toMonthKey(start),
              total,
            };
          });
      }),
    );

    return totals;
  }

  private async sumPaymentsBetween(start: Date, end: Date) {
    const rows = (await this.paymentRepository
      .createQueryBuilder('payment')
      .select([raw('coalesce(sum(payment.amount), 0) as total')])
      .where({
        createdAt: { $gte: start, $lt: end },
      })
      .execute()) as Array<{ total?: string | number }>;

    return this.formatAmount(rows[0]?.total ?? '0');
  }

  private async sumPayoutsBetween(start: Date, end: Date) {
    const rows = (await this.payoutRepository
      .createQueryBuilder('payout')
      .select([raw('coalesce(sum(payout.amount), 0) as total')])
      .where({
        createdAt: { $gte: start, $lt: end },
      })
      .execute()) as Array<{ total?: string | number }>;

    return this.formatAmount(rows[0]?.total ?? '0');
  }

  private async computePodContributions() {
    const [plans, groupedTotals] = await Promise.all([
      this.podPlanRepository.findAll({ orderBy: { code: 'ASC' } }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select([
          raw('pod.plan_code as planCode'),
          raw('coalesce(sum(payment.amount), 0) as total'),
        ])
        .leftJoin('payment.pod', 'pod')
        .groupBy('pod.plan_code')
        .execute(),
    ]);

    const totalsMap = new Map<string, string>();
    (groupedTotals as Array<{ planCode?: string | null; total?: string | number }>).forEach(
      (row) => {
        if (row.planCode) {
          totalsMap.set(row.planCode, this.formatAmount(row.total ?? '0'));
        }
      }
    );

    return plans.map((plan) => ({
      planCode: plan.code,
      totalContributed: totalsMap.get(plan.code) ?? '0.00',
    }));
  }

  private async computeKycSummary() {
    const statusCounts = (await this.verificationAttemptRepository
      .createQueryBuilder('attempt')
      .select([
        raw('lower(attempt.status) as status'),
        raw('count(*) as count'),
      ])
      .groupBy('status')
      .execute()) as Array<{ status?: string; count?: string | number }>;

    const totals = statusCounts.reduce(
      (acc, row) => acc + Number.parseInt(String(row.count ?? '0'), 10),
      0,
    );

    const successStatuses = new Set(['verified', 'approved', 'completed']);
    const rejectedStatuses = new Set([
      'rejected',
      'failed',
      'declined',
      'canceled',
      'cancelled',
    ]);

    let successCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    statusCounts.forEach((row) => {
      const status = String(row.status ?? '').toLowerCase();
      const count = Number.parseInt(String(row.count ?? '0'), 10);
      if (successStatuses.has(status)) {
        successCount += count;
      } else if (rejectedStatuses.has(status)) {
        rejectedCount += count;
      } else {
        pendingCount += count;
      }
    });

    const successPercentage = this.percentageOf(successCount, totals);
    const rejectedPercentage = this.percentageOf(rejectedCount, totals);
    const pendingPercentage = this.percentageOf(pendingCount, totals);

    const lastAttempts = await this.verificationAttemptRepository.find(
      {},
      {
        orderBy: { createdAt: 'DESC' },
        populate: ['account'],
        limit: 5,
      },
    );

    return {
      successPercentage,
      rejectedPercentage,
      pendingPercentage,
      lastAttempts: lastAttempts.map((attempt) => ({
        id: attempt.id,
        accountEmail: attempt.account.email,
        status: attempt.status,
        type: attempt.type,
        stripeReference: attempt.stripeReference ?? null,
        recordedAt: attempt.createdAt.toISOString(),
      })),
    };
  }

  private async computeRecentTransactions() {
    const transactions = await this.transactionRepository.find(
      {},
      {
        orderBy: { createdAt: 'DESC' },
        populate: ['account', 'pod'],
        limit: 5,
      },
    );

    return transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type ?? TransactionType.PAYMENT,
      amount: this.formatAmount(transaction.amount),
      currency: transaction.currency,
      status: transaction.status,
      stripeReference: transaction.stripeReference,
      recordedAt: transaction.createdAt.toISOString(),
      accountEmail: transaction.account.email,
      podId: transaction.pod.id,
      podPlanCode: transaction.pod.planCode,
    }));
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date.getTime());
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());
    result.setUTCMonth(result.getUTCMonth() + months, 1);
    return this.startOfDay(result);
  }

  private startOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private buildSequentialDayKeys(anchor: Date, length: number): string[] {
    return Array.from({ length }, (_, index) =>
      this.toDayKey(this.addDays(anchor, -(length - 1 - index))),
    );
  }

  private toDayKey(date: Date): string {
    const working = new Date(date.getTime());
    working.setUTCHours(0, 0, 0, 0);
    return working.toISOString().slice(0, 10);
  }

  private toMonthKey(date: Date): string {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private daysBetween(start: Date, end: Date): number {
    const diff =
      (this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.max(1, Math.round(diff));
  }

  private daysElapsedInclusive(start: Date, end: Date): number {
    const diff =
      (this.startOfDay(end).getTime() - this.startOfDay(start).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.max(1, Math.floor(diff) + 1);
  }

  private percentageChange(current: number, previous: number): number | null {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) {
      return null;
    }

    if (previous === 0) {
      return current === 0 ? 0 : null;
    }

    const change = ((current - previous) / previous) * 100;
    return this.round(change);
  }

  private percentageOf(value: number, total: number): number {
    if (!total) {
      return 0;
    }
    return this.round((value / total) * 100);
  }

  private round(value: number, precision = 2): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  private formatAmount(amount: string | number): string {
    const numeric = Number.parseFloat(String(amount));
    if (!Number.isFinite(numeric)) {
      return '0.00';
    }
    return (Math.round(numeric * 100) / 100).toFixed(2);
  }
}
