import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../admin-role.enum';
import type {
  AdminDashboardResult,
  AdminLoginResult,
  AdminUserDto,
  CreateAdminUserResult,
  IncomeAnalysis,
  KycAttemptSummary,
  KycSummary,
  MetricWithChange,
  MonthlyTotalPoint,
  PodContributionSummary,
  PayoutAnalysis,
  TransactionSummary,
} from './admin-results';

export class AdminLoginResultDto implements AdminLoginResult {
  @ApiProperty({ description: 'JWT access token for admin APIs.' })
  accessToken!: string;

  @ApiProperty({ description: 'Token type.', example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'ISO timestamp when the token expires.' })
  expiresAt!: string;

  @ApiProperty({ enum: AdminRole, description: 'Role associated with the admin.' })
  role!: AdminRole;

  @ApiProperty({
    description: 'Indicates whether the logged-in admin is the super admin.',
    example: true,
  })
  isSuperAdmin!: boolean;
}

export class AdminUserDtoClass implements AdminUserDto {
  @ApiProperty({ description: 'Admin user identifier.' })
  id!: string;

  @ApiProperty({ description: 'Admin email address.' })
  email!: string;

  @ApiProperty({ enum: AdminRole, description: 'Role assigned to the admin.' })
  role!: AdminRole;

  @ApiProperty({ description: 'ISO timestamp when the admin was created.' })
  createdAt!: string;

  @ApiProperty({
    description: 'ISO timestamp of the last login, if any.',
    nullable: true,
  })
  lastLoginAt!: string | null;
}

export class CreateAdminUserResultDto
  extends AdminUserDtoClass
  implements CreateAdminUserResult {}

export class MetricWithChangeNumberDto
  implements MetricWithChange<number>
{
  @ApiProperty({ description: 'Primary metric value.' })
  value!: number;

  @ApiProperty({
    description: 'Percentage difference versus the comparison period.',
    nullable: true,
    example: 12.5,
  })
  percentageChange!: number | null;
}

export class MonthlyTotalPointDto implements MonthlyTotalPoint {
  @ApiProperty({ description: 'Month label in YYYY-MM format.', example: '2025-08' })
  month!: string;

  @ApiProperty({ description: 'Total amount for the month as a fixed decimal string.', example: '5000.00' })
  total!: string;
}

export class IncomeAnalysisDto implements IncomeAnalysis {
  @ApiProperty({ description: 'Cumulative incoming contributions in the current month.', example: '150000.00' })
  totalIncoming!: string;

  @ApiProperty({
    description: 'Percentage change compared to the previous month, null when not computable.',
    nullable: true,
    example: 8.2,
  })
  percentageChange!: number | null;

  @ApiProperty({
    description: 'Contribution totals for the last three months (oldest first).',
    type: [MonthlyTotalPointDto],
  })
  monthlyTotals!: MonthlyTotalPointDto[];
}

export class PayoutAnalysisDto implements PayoutAnalysis {
  @ApiProperty({ description: 'Cumulative payouts recorded in the current month.', example: '120000.00' })
  totalPayouts!: string;

  @ApiProperty({
    description: 'Percentage change compared to the previous month, null when not computable.',
    nullable: true,
    example: -3.4,
  })
  percentageChange!: number | null;

  @ApiProperty({
    description: 'Payout totals for the last three months (oldest first).',
    type: [MonthlyTotalPointDto],
  })
  monthlyTotals!: MonthlyTotalPointDto[];
}

export class PodContributionSummaryDto implements PodContributionSummary {
  @ApiProperty({ description: 'Pod plan code.', example: 'STARTER' })
  planCode!: string;

  @ApiProperty({ description: 'Total contributions recorded for the plan.', example: '25000.00' })
  totalContributed!: string;
}

export class KycAttemptSummaryDto implements KycAttemptSummary {
  @ApiProperty({ description: 'Verification attempt identifier.' })
  id!: string;

  @ApiProperty({ description: 'Associated account email address.' })
  accountEmail!: string;

  @ApiProperty({ description: 'Status reported for the attempt.', example: 'verified' })
  status!: string;

  @ApiProperty({ description: 'Type of verification performed.', example: 'document' })
  type!: string;

  @ApiProperty({
    description: 'Stripe reference identifier linked to the attempt, if any.',
    nullable: true,
  })
  stripeReference!: string | null;

  @ApiProperty({ description: 'ISO timestamp when the attempt was recorded.' })
  recordedAt!: string;
}

export class KycSummaryDto implements KycSummary {
  @ApiProperty({ description: 'Percentage of attempts marked successful.', example: 75.5 })
  successPercentage!: number;

  @ApiProperty({ description: 'Percentage of attempts marked rejected.', example: 10.2 })
  rejectedPercentage!: number;

  @ApiProperty({ description: 'Percentage of attempts still pending review.', example: 14.3 })
  pendingPercentage!: number;

  @ApiProperty({
    description: 'Most recent verification attempts.',
    type: [KycAttemptSummaryDto],
  })
  lastAttempts!: KycAttemptSummaryDto[];
}

export class TransactionSummaryDto implements TransactionSummary {
  @ApiProperty({ description: 'Transaction identifier.' })
  id!: string;

  @ApiProperty({ description: 'Transaction type.', example: 'payment' })
  type!: string;

  @ApiProperty({ description: 'Transaction amount expressed as a fixed decimal string.', example: '5000.00' })
  amount!: string;

  @ApiProperty({ description: 'Transaction currency code.', example: 'NGN' })
  currency!: string;

  @ApiProperty({ description: 'Status returned by the payment processor.', example: 'succeeded' })
  status!: string;

  @ApiProperty({ description: 'Stripe reference identifier for the transaction.' })
  stripeReference!: string;

  @ApiProperty({ description: 'ISO timestamp when the transaction was captured.' })
  recordedAt!: string;

  @ApiProperty({ description: 'Email of the account associated with the transaction.' })
  accountEmail!: string;

  @ApiProperty({ description: 'Pod identifier linked to the transaction.' })
  podId!: string;

  @ApiProperty({ description: 'Pod plan code linked to the transaction.' })
  podPlanCode!: string;
}

export class AdminDashboardMetricsDto
  implements AdminDashboardResult['metrics']
{
  @ApiProperty({ description: 'Total active users and day-over-day delta.', type: MetricWithChangeNumberDto })
  totalActiveUsers!: MetricWithChangeNumberDto;

  @ApiProperty({ description: 'New signups recorded today and the daily delta.', type: MetricWithChangeNumberDto })
  newSignupsToday!: MetricWithChangeNumberDto;

  @ApiProperty({ description: 'Average daily growth (7-day lookback) and comparison window delta.', type: MetricWithChangeNumberDto })
  averageDailyUserGrowth!: MetricWithChangeNumberDto;

  @ApiProperty({ description: 'Average monthly growth (current month) and comparison delta vs previous month.', type: MetricWithChangeNumberDto })
  averageMonthlyUserGrowth!: MetricWithChangeNumberDto;
}

export class AdminDashboardResultDto implements AdminDashboardResult {
  @ApiProperty({
    description: 'Key user growth metrics.',
    type: AdminDashboardMetricsDto,
  })
  metrics!: AdminDashboardMetricsDto;

  @ApiProperty({ description: 'Contribution income analysis.', type: IncomeAnalysisDto })
  incomeAnalysis!: IncomeAnalysisDto;

  @ApiProperty({ description: 'Payout analysis.', type: PayoutAnalysisDto })
  payoutAnalysis!: PayoutAnalysisDto;

  @ApiProperty({
    description: 'Contributions aggregated per pod plan.',
    type: [PodContributionSummaryDto],
  })
  podContributions!: PodContributionSummaryDto[];

  @ApiProperty({ description: 'KYC success ratios and recent attempts.', type: KycSummaryDto })
  kycSummary!: KycSummaryDto;

  @ApiProperty({
    description: 'Most recent transactions.',
    type: [TransactionSummaryDto],
  })
  recentTransactions!: TransactionSummaryDto[];
}
