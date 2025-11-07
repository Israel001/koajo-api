import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../admin-role.enum';
import { PodActivityDto } from '../../pods/dto/pod-activity.dto';
import { PodStatus } from '../../pods/pod-status.enum';
import { PodType } from '../../pods/pod-type.enum';
import { CustomPodCadence } from '../../pods/custom-pod-cadence.enum';
import { PodGoalType } from '../../pods/pod-goal.enum';
import type {
  AdminDashboardMetrics,
  AdminDashboardResult,
  AdminLoginResult,
  AdminUserDto,
  CreateAdminUserResult,
  AdminPodPlanSummary,
  AdminPodPlansListResult,
  IncomeAnalysis,
  KycAttemptSummary,
  KycSummary,
  MetricWithChange,
  MonthlyTotalPoint,
  PodContributionSummary,
  PayoutAnalysis,
  TransactionSummary,
  AdminRoleSummary,
  AdminPermissionSummary,
  AdminChangePasswordResult,
  AdminForgotPasswordResult,
  AdminResetPasswordResult,
  AdminPodStatistics,
  AdminAnnouncementResult,
  AdminAnnouncementsListResult,
  AdminAccountPodMembership,
  AdminAccountVerificationAttempt,
  AdminAccountVerificationsListResult,
} from './admin-results';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

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

  @ApiProperty({ description: 'Flattened list of granted permission codes.' })
  permissions!: string[];

  @ApiProperty({ description: 'Indicates if the admin must change their password after login.' })
  requiresPasswordChange!: boolean;

  @ApiProperty({ description: 'Refresh token to obtain new access tokens.', nullable: true })
  refreshToken!: string | null;

  @ApiProperty({ description: 'ISO timestamp when the refresh token expires.', nullable: true })
  refreshExpiresAt!: string | null;
}

export class AdminChangePasswordResultDto
  implements AdminChangePasswordResult
{
  @ApiProperty({ description: 'Indicates that the password was updated successfully.' })
  success!: boolean;
}

export class AdminForgotPasswordResultDto
  implements AdminForgotPasswordResult
{
  @ApiProperty({ description: 'Admin email address associated with the reset request.' })
  email!: string;

  @ApiProperty({ description: 'Indicates that the reset flow was initiated.' })
  requested!: boolean;
}

export class AdminResetPasswordResultDto
  implements AdminResetPasswordResult
{
  @ApiProperty({ description: 'Admin email address for which the password was reset.' })
  email!: string;

  @ApiProperty({ description: 'Indicates that the password reset was successful.' })
  reset!: boolean;
}

export class AdminPermissionSummaryDto implements AdminPermissionSummary {
  @ApiProperty({ description: 'Permission identifier.' })
  id!: string;

  @ApiProperty({ description: 'Permission code.', example: 'admin.users.view' })
  code!: string;

  @ApiProperty({ description: 'Human-friendly permission name.', nullable: true })
  name!: string | null;

  @ApiProperty({ description: 'Describes what the permission allows.', nullable: true })
  description!: string | null;
}

export class AdminRoleSummaryDto implements AdminRoleSummary {
  @ApiProperty({ description: 'Role identifier.' })
  id!: string;

  @ApiProperty({ description: 'Role name.' })
  name!: string;

  @ApiProperty({ description: 'Role description.', nullable: true })
  description!: string | null;

  @ApiProperty({
    description: 'Permissions associated with the role.',
    type: [AdminPermissionSummaryDto],
  })
  permissions!: AdminPermissionSummaryDto[];
}

export class AdminUserDtoClass implements AdminUserDto {
  @ApiProperty({ description: 'Admin user identifier.' })
  id!: string;

  @ApiProperty({ description: 'Admin email address.' })
  email!: string;

  @ApiProperty({ description: 'Admin first name.', nullable: true })
  firstName!: string | null;

  @ApiProperty({ description: 'Admin last name.', nullable: true })
  lastName!: string | null;

  @ApiProperty({ description: 'Admin phone number.', nullable: true })
  phoneNumber!: string | null;

  @ApiProperty({ description: 'Indicates whether the admin account is active.' })
  isActive!: boolean;

  @ApiProperty({
    description: 'Indicates whether the admin must change their password on next login.',
  })
  requiresPasswordChange!: boolean;

  @ApiProperty({ description: 'ISO timestamp when the admin was created.' })
  createdAt!: string;

  @ApiProperty({ description: 'ISO timestamp when the admin record was last updated.' })
  updatedAt!: string;

  @ApiProperty({ description: 'ISO timestamp when the admin was invited.', nullable: true })
  invitedAt!: string | null;

  @ApiProperty({
    description: 'Identifier of the admin who invited this user.',
    nullable: true,
  })
  invitedById!: string | null;

  @ApiProperty({
    description: 'ISO timestamp of the last login, if any.',
    nullable: true,
  })
  lastLoginAt!: string | null;

  @ApiProperty({
    description: 'Roles currently assigned to the admin.',
    type: [AdminRoleSummaryDto],
  })
  roles!: AdminRoleSummaryDto[];

  @ApiProperty({
    description: 'Permissions explicitly added to the admin user.',
    type: [AdminPermissionSummaryDto],
  })
  explicitPermissions!: AdminPermissionSummaryDto[];

  @ApiProperty({
    description: 'Permissions explicitly removed from the admin user.',
    type: [AdminPermissionSummaryDto],
  })
  deniedPermissions!: AdminPermissionSummaryDto[];

  @ApiProperty({ description: 'Flattened list of effective permission codes granted to the admin.' })
  effectivePermissions!: string[];
}

export class CreateAdminUserResultDto
  extends AdminUserDtoClass
  implements CreateAdminUserResult
{
  @ApiProperty({
    description: 'Temporary password issued to the admin user, if system-generated.',
    nullable: true,
  })
  temporaryPassword?: string;
}

export class AdminAccountPodMembershipDto
  implements AdminAccountPodMembership
{
  @ApiProperty({ description: 'Pod membership identifier.' })
  membershipId!: string;

  @ApiProperty({ description: 'Pod identifier.' })
  podId!: string;

  @ApiProperty({ description: 'Pod plan code.', example: '100-12' })
  planCode!: string;

  @ApiProperty({ description: 'Pod name.', nullable: true })
  name!: string | null;

  @ApiProperty({ description: 'Contribution amount per cycle.' })
  amount!: number;

  @ApiProperty({ description: 'Total lifecycle length in weeks.' })
  lifecycleWeeks!: number;

  @ApiProperty({ description: 'Maximum number of members allowed in the pod.' })
  maxMembers!: number;

  @ApiProperty({ enum: PodStatus, description: 'Current pod status.' })
  status!: PodStatus;

  @ApiProperty({ enum: PodType, description: 'Type of pod (system or custom).' })
  podType!: PodType;

  @ApiProperty({
    enum: CustomPodCadence,
    nullable: true,
    description: 'Cadence for custom pods.',
  })
  cadence!: CustomPodCadence | null;

  @ApiProperty({ description: 'Join order for the member.' })
  joinOrder!: number;

  @ApiProperty({ description: 'Final payout order, if assigned.', nullable: true })
  finalOrder!: number | null;

  @ApiProperty({ description: 'Scheduled payout date for the member.', nullable: true })
  payoutDate!: string | null;

  @ApiProperty({ description: 'Indicates whether the member has been paid out.' })
  paidOut!: boolean;

  @ApiProperty({ description: 'Timestamp when the member joined the pod.' })
  joinedAt!: string;

  @ApiProperty({
    description: 'Total amount contributed by the member.',
    example: '2500.00',
  })
  totalContributed!: string;

  @ApiProperty({ enum: PodGoalType, description: 'Savings goal selected for the pod.' })
  goalType!: PodGoalType;

  @ApiProperty({ description: 'Goal description when applicable.', nullable: true })
  goalNote!: string | null;

  @ApiProperty({
    description: 'Timestamp indicating when the pod completed, if applicable.',
    nullable: true,
  })
  completedAt!: string | null;
}

export class AdminAccountVerificationAttemptDto
  implements AdminAccountVerificationAttempt
{
  @ApiProperty({ description: 'Verification attempt identifier.' })
  id!: string;

  @ApiProperty({ description: 'Account identifier.', nullable: true })
  accountId!: string | null;

  @ApiProperty({ description: 'Account email address.', nullable: true })
  accountEmail!: string | null;

  @ApiProperty({ description: 'Provider handling the verification.' })
  provider!: string;

  @ApiProperty({ description: 'Verification type reported by Stripe.' })
  type!: string;

  @ApiProperty({ description: 'Status stored in Koajo.' })
  status!: string;

  @ApiProperty({ description: 'Stripe verification session identifier.' })
  sessionId!: string;

  @ApiProperty({ description: 'Provider reference recorded for the attempt.', nullable: true })
  providerReference!: string | null;

  @ApiProperty({ description: 'Stripe-provided reference identifier.', nullable: true })
  stripeReference!: string | null;

  @ApiProperty({ description: 'Stripe verification report identifier.', nullable: true })
  resultId!: string | null;

  @ApiProperty({ description: 'Timestamp when the attempt was recorded.' })
  recordedAt!: string;

  @ApiProperty({ description: 'Timestamp when the attempt completed.', nullable: true })
  completedAt!: string | null;

  @ApiProperty({
    description: 'Raw Stripe verification session payload.',
    nullable: true,
    type: Object,
  })
  stripeSession!: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Error message encountered while fetching the Stripe session.',
    nullable: true,
  })
  stripeError!: string | null;

  @ApiProperty({
    description: 'Timestamp when the Stripe session snapshot was last stored.',
    nullable: true,
  })
  stripeSessionRetrievedAt!: string | null;
}

export class AdminAccountVerificationsListResultDto
  implements AdminAccountVerificationsListResult
{
  @ApiProperty({ description: 'Total verification attempts found.' })
  total!: number;

  @ApiProperty({
    description: 'Verification attempts for the current page.',
    type: [AdminAccountVerificationAttemptDto],
  })
  items!: AdminAccountVerificationAttemptDto[];
}

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

export class AdminPodPlanSummaryDto implements AdminPodPlanSummary {
  @ApiProperty({ description: 'Pod plan identifier.' })
  id!: string;

  @ApiProperty({ description: 'Unique plan code.', example: 'STARTER-12' })
  code!: string;

  @ApiProperty({ description: 'Contribution amount per cycle.', example: 50000 })
  amount!: number;

  @ApiProperty({ description: 'Lifecycle length in weeks.', example: 12 })
  lifecycleWeeks!: number;

  @ApiProperty({ description: 'Maximum members allowed in the plan.', example: 10 })
  maxMembers!: number;

  @ApiProperty({ description: 'Whether the plan is currently active.' })
  active!: boolean;

  @ApiProperty({ description: 'ISO timestamp when the plan was created.' })
  createdAt!: string;

  @ApiProperty({ description: 'ISO timestamp when the plan was last updated.' })
  updatedAt!: string;

  @ApiProperty({ description: 'Number of pods currently referencing this plan.', example: 4 })
  totalPods!: number;

  @ApiProperty({ description: 'Number of pods that have at least one real member.', example: 2 })
  podsWithMembers!: number;

  @ApiProperty({ description: 'Indicates if the plan can be edited.', example: true })
  canEdit!: boolean;

  @ApiProperty({ description: 'Indicates if the plan can be deleted.', example: false })
  canDelete!: boolean;
}

export class AdminPodPlansListResultDto implements AdminPodPlansListResult {
  @ApiProperty({ description: 'Total number of matching pod plans.', example: 8 })
  total!: number;

  @ApiProperty({
    description: 'List of pod plans.',
    type: [AdminPodPlanSummaryDto],
  })
  items!: AdminPodPlanSummaryDto[];
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

export class AdminPodActivityDto extends PodActivityDto {}

export class AdminPodStatisticsDto implements AdminPodStatistics {
  @ApiProperty({ description: 'Number of pods currently open for members to join.' })
  totalOpenPods!: number;

  @ApiProperty({ description: 'Total number of members currently participating in pods.' })
  totalMembers!: number;

  @ApiProperty({ description: 'Total number of outstanding pod invitations awaiting acceptance.' })
  totalPendingInvites!: number;

  @ApiProperty({ description: 'Total pods that have not yet completed their lifecycle.' })
  totalIncompletePods!: number;
}

export class AdminAnnouncementResultDto implements AdminAnnouncementResult {
  @ApiProperty({ description: 'Announcement identifier.' })
  id!: string;

  @ApiProperty({ description: 'Announcement name.' })
  name!: string;

  @ApiProperty({ enum: AnnouncementChannel, description: 'Delivery channel for the announcement.' })
  channel!: AnnouncementChannel;

  @ApiProperty({ enum: AnnouncementSeverity, description: 'Severity level associated with the announcement.' })
  severity!: AnnouncementSeverity;

  @ApiProperty({ description: 'Title used for in-app notifications or email subject.' })
  notificationTitle!: string;

  @ApiProperty({ description: 'Indicates whether the announcement was broadcast to all users.' })
  sendToAll!: boolean;

  @ApiProperty({ description: 'Optional action URL associated with the announcement.', nullable: true })
  actionUrl!: string | null;

  @ApiProperty({ description: 'Optional image URL attached to the announcement.', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ description: 'Number of users targeted by the announcement.' })
  totalRecipients!: number;

  @ApiProperty({ description: 'Timestamp when the announcement was created.' })
  createdAt!: string;
}

export class AdminAnnouncementsListResultDto
  implements AdminAnnouncementsListResult
{
  @ApiProperty({ description: 'Total announcements matching the supplied filters.' })
  total!: number;

  @ApiProperty({
    description: 'Announcements returned for the current page.',
    type: [AdminAnnouncementResultDto],
  })
  items!: AdminAnnouncementResultDto[];
}

export class AdminDashboardMetricsDto implements AdminDashboardMetrics {
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
