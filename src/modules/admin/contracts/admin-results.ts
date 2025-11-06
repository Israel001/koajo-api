import { AdminRole } from '../admin-role.enum';
import type { PodActivitySummary } from '../../pods/contracts/pod-activity-summary';
import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

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
}

export interface AdminAccountsListResult {
  total: number;
  items: AdminAccountListItem[];
}

export interface AdminAccountDetail extends AdminAccountListItem {}

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
  joinOrder: number;
  finalOrder: number | null;
  payoutDate: string | null;
  paidOut: boolean;
}

export interface AdminPodDetail extends AdminPodSummary {
  memberships: AdminPodMembershipSummary[];
}

export interface AdminPodsListResult {
  total: number;
  items: AdminPodSummary[];
}

export interface AdminPodActivity extends PodActivitySummary {}

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
