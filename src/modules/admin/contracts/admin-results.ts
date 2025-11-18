import { AdminRole } from '../admin-role.enum';
import type { PodActivitySummary } from '../../pods/contracts/pod-activity-summary';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';
import { PodStatus } from '../../pods/pod-status.enum';
import { PodType } from '../../pods/pod-type.enum';
import { PodGoalType } from '../../pods/pod-goal.enum';
import { CustomPodCadence } from '../../pods/custom-pod-cadence.enum';

export interface AdminPermissionSummary {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
}

export interface AdminRoleSummary {
  id: string;
  name: string;
  description: string | null;
  permissions: AdminPermissionSummary[];
}

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
  invitedAt: string | null;
  invitedById: string | null;
  lastLoginAt: string | null;
  roles: AdminRoleSummary[];
  explicitPermissions: AdminPermissionSummary[];
  deniedPermissions: AdminPermissionSummary[];
  effectivePermissions: string[];
}

export interface CreateAdminUserResult extends AdminUserDto {
  temporaryPassword?: string;
}

export interface AdminLoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  role: AdminRole;
  isSuperAdmin: boolean;
  permissions: string[];
  requiresPasswordChange: boolean;
  refreshToken: string | null;
  refreshExpiresAt: string | null;
}

export interface AdminChangePasswordResult {
  success: boolean;
}

export interface AdminForgotPasswordResult {
  email: string;
  requested: boolean;
}

export interface AdminResetPasswordResult {
  email: string;
  reset: boolean;
}

export type AdminKycStatus = 'verified' | 'pending' | 'not_started' | 'failed';

export interface AdminAccountListItem {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isActive: boolean;
  emailNotificationsEnabled: boolean;
  transactionNotificationsEnabled: boolean;
  kycStatus: AdminKycStatus;
  bankAccountLinked: boolean;
  requiresFraudReview: boolean;
  fraudReviewReason: string | null;
  missedPaymentFlag: boolean;
  missedPaymentReason: string | null;
  overheatFlag: boolean;
  overheatReason: string | null;
}

export interface AdminAccountsListResult {
  total: number;
  items: AdminAccountListItem[];
}

export interface AdminAccountDetail extends AdminAccountListItem {}
export interface AdminAccountBankDetails {
  bankName: string | null;
  paymentMethodId: string | null;
  accountLast4: string | null;
  customerId: string | null;
  bankAccountId: string | null;
  linkedAt: string | null;
  updatedAt: string | null;
}

export interface AdminAccountDetailWithBank extends AdminAccountListItem {
  bankAccount: AdminAccountBankDetails | null;
}

export interface AdminAccountPodMembership {
  membershipId: string;
  podId: string;
  planCode: string;
  name: string | null;
  amount: number;
  lifecycleWeeks: number;
  maxMembers: number;
  status: PodStatus;
  podType: PodType;
  cadence: CustomPodCadence | null;
  joinOrder: number;
  finalOrder: number | null;
  payoutDate: string | null;
  paidOut: boolean;
  joinedAt: string;
  totalContributed: string;
  goalType: PodGoalType;
  goalNote: string | null;
  completedAt: string | null;
  payoutAmount: string | null;
}

export interface AdminAccountVerificationAttempt {
  id: string;
  accountId: string | null;
  accountEmail: string | null;
  provider: string;
  type: string;
  status: string;
  sessionId: string;
  providerReference: string | null;
  stripeReference: string | null;
  resultId: string | null;
  recordedAt: string;
  completedAt: string | null;
  stripeSession: Record<string, unknown> | null;
  stripeError: string | null;
  stripeSessionRetrievedAt: string | null;
}

export interface AdminAccountVerificationsListResult {
  total: number;
  items: AdminAccountVerificationAttempt[];
}

export interface AdminDashboardMetrics {
  totalActiveUsers: MetricWithChange<number>;
  newSignupsToday: MetricWithChange<number>;
  averageDailyUserGrowth: MetricWithChange<number>;
  averageMonthlyUserGrowth: MetricWithChange<number>;
}

export interface AdminPodSummary {
  id: string;
  type: string;
  status: string;
  amount: number;
  lifecycleWeeks: number;
  maxMembers: number;
  currentMembers: number;
  creatorId: string | null;
  createdAt: string;
}

export interface AdminPodMembershipSummary {
  id: string;
  accountId: string | null;
  account: AdminAccountDetail | null;
  joinOrder: number;
  finalOrder: number | null;
  payoutDate: string | null;
  paidOut: boolean;
  joinedAt: string;
}

export interface AdminPodDetail extends AdminPodSummary {
  memberships: AdminPodMembershipSummary[];
  pendingInvites: AdminPodInviteSummary[];
}

export interface AdminPodsListResult {
  total: number;
  items: AdminPodSummary[];
}

export interface AdminPodActivityActor {
  accountId: string;
  avatarUrl: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface AdminPodActivity
  extends Omit<PodActivitySummary, 'actor'> {
  actor: AdminPodActivityActor | null;
}

export interface AdminPodPlanSummary {
  id: string;
  code: string;
  amount: number;
  lifecycleWeeks: number;
  maxMembers: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  totalPods: number;
  podsWithMembers: number;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AdminPodPlansListResult {
  total: number;
  items: AdminPodPlanSummary[];
}

export interface AdminPodStatistics {
  totalOpenPods: number;
  totalMembers: number;
  totalPendingInvites: number;
  totalIncompletePods: number;
}

export interface AdminPodInviteSummary {
  id: string;
  podId: string;
  podPlanCode: string;
  podName: string | null;
  email: string;
  inviteOrder: number;
  invitedAt: string;
  acceptedAt: string | null;
  accountId: string | null;
}

export interface AdminPodInviteListResult {
  total: number;
  items: AdminPodInviteSummary[];
}

export interface AdminPaymentSummary {
  id: string;
  membershipId: string;
  podId: string;
  podPlanCode: string;
  podName: string | null;
  amount: string;
  currency: string;
  status: string;
  stripeReference: string;
  description: string | null;
  recordedAt: string;
}

export interface AdminPaymentListResult {
  total: number;
  items: AdminPaymentSummary[];
}

export interface AdminPayoutSummary {
  id: string;
  membershipId: string;
  podId: string;
  podPlanCode: string;
  podName: string | null;
  amount: string;
  fee: string;
  currency: string;
  status: string;
  stripeReference: string;
  description: string | null;
  recordedAt: string;
}

export interface AdminPayoutListResult {
  total: number;
  items: AdminPayoutSummary[];
}

export interface AdminAnnouncementResult {
  id: string;
  name: string;
  channel: AnnouncementChannel;
  severity: AnnouncementSeverity;
  notificationTitle: string;
  sendToAll: boolean;
  actionUrl: string | null;
  imageUrl: string | null;
  totalRecipients: number;
  createdAt: string;
}

export interface AdminAnnouncementsListResult {
  total: number;
  items: AdminAnnouncementResult[];
}

export interface AdminAchievementDefinition {
  code: string;
  name: string;
  description: string;
}

export interface MetricWithChange<TValue = number> {
  value: TValue;
  percentageChange: number | null;
}

export interface MonthlyTotalPoint {
  month: string;
  total: string;
}

export interface IncomeAnalysis {
  totalIncoming: string;
  percentageChange: number | null;
  monthlyTotals: MonthlyTotalPoint[];
}

export interface PayoutAnalysis {
  totalPayouts: string;
  percentageChange: number | null;
  monthlyTotals: MonthlyTotalPoint[];
}

export interface PodContributionSummary {
  planCode: string;
  totalContributed: string;
}

export interface KycAttemptSummary {
  id: string;
  accountEmail: string;
  status: string;
  type: string;
  stripeReference: string | null;
  recordedAt: string;
}

export interface TransactionSummary {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  stripeReference: string;
  recordedAt: string;
  accountEmail: string;
  podId: string;
  podPlanCode: string;
}

export interface KycSummary {
  successPercentage: number;
  rejectedPercentage: number;
  pendingPercentage: number;
  lastAttempts: KycAttemptSummary[];
}

export interface AdminDashboardResult {
  metrics: AdminDashboardMetrics;
  incomeAnalysis: IncomeAnalysis;
  payoutAnalysis: PayoutAnalysis;
  podContributions: PodContributionSummary[];
  kycSummary: KycSummary;
  recentTransactions: TransactionSummary[];
}
