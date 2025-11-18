export interface AdminPermissionDefinition {
  code: string;
  name: string;
  description: string;
}

export const ADMIN_PERMISSION_VIEW_DASHBOARD = 'admin.dashboard.view';
export const ADMIN_PERMISSION_VIEW_USERS = 'admin.users.view';
export const ADMIN_PERMISSION_EDIT_USER_DETAILS = 'admin.users.edit';
export const ADMIN_PERMISSION_TOGGLE_USER_STATUS = 'admin.users.toggle-status';
export const ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS =
  'admin.users.notifications.manage';
export const ADMIN_PERMISSION_DELETE_USERS = 'admin.users.delete';
export const ADMIN_PERMISSION_VIEW_POD_PLANS = 'admin.pod-plans.view';
export const ADMIN_PERMISSION_REFRESH_POD_PLANS = 'admin.pod-plans.refresh';
export const ADMIN_PERMISSION_VIEW_PODS = 'admin.pods.view';
export const ADMIN_PERMISSION_VIEW_TRANSACTIONS = 'admin.transactions.view';
export const ADMIN_PERMISSION_VIEW_KYC_DETAILS = 'admin.kyc.view';
export const ADMIN_PERMISSION_VIEW_ADMIN_USERS = 'admin.team.view';
export const ADMIN_PERMISSION_MANAGE_ADMIN_USERS = 'admin.team.manage';
export const ADMIN_PERMISSION_ASSIGN_ADMIN_ROLES = 'admin.team.assign-roles';
export const ADMIN_PERMISSION_EDIT_ROLES = 'admin.roles.edit';
export const ADMIN_PERMISSION_CREATE_ANNOUNCEMENTS =
  'admin.announcements.create';
export const ADMIN_PERMISSION_TRIGGER_PAYOUTS = 'admin.payouts.trigger';

export const ADMIN_PERMISSION_DEFINITIONS: AdminPermissionDefinition[] = [
  {
    code: ADMIN_PERMISSION_VIEW_DASHBOARD,
    name: 'View Dashboard',
    description: 'Access the admin dashboard and view aggregated metrics.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_USERS,
    name: 'View Users',
    description: 'Browse and inspect customer accounts.',
  },
  {
    code: ADMIN_PERMISSION_EDIT_USER_DETAILS,
    name: 'Edit User Details',
    description: 'Modify customer account profile information.',
  },
  {
    code: ADMIN_PERMISSION_TOGGLE_USER_STATUS,
    name: 'Suspend or Unsuspend Users',
    description:
      'Pause or reactivate customer accounts and update their active status.',
  },
  {
    code: ADMIN_PERMISSION_MANAGE_USER_NOTIFICATIONS,
    name: 'Manage User Notification Preferences',
    description:
      'Adjust email and transaction notification preferences on behalf of customers.',
  },
  {
    code: ADMIN_PERMISSION_DELETE_USERS,
    name: 'Delete Users',
    description:
      'Permanently delete or anonymize customer accounts from the platform.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_POD_PLANS,
    name: 'View Pod Plans',
    description: 'List pod plans that are available in the system.',
  },
  {
    code: ADMIN_PERMISSION_REFRESH_POD_PLANS,
    name: 'Refresh Pod Plans',
    description:
      'Trigger reprocessing of pod plans or perform maintenance actions on plans.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_PODS,
    name: 'View Pods',
    description: 'List pods and inspect pod membership or activity.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_TRANSACTIONS,
    name: 'View Transactions',
    description: 'Access transaction ledgers and payment history.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_KYC_DETAILS,
    name: 'View KYC Details',
    description:
      'Inspect customer identity verification attempts and related information.',
  },
  {
    code: ADMIN_PERMISSION_VIEW_ADMIN_USERS,
    name: 'View Admin Users',
    description: 'Browse the list of admin users.',
  },
  {
    code: ADMIN_PERMISSION_MANAGE_ADMIN_USERS,
    name: 'Add or Remove Admin Users',
    description:
      'Create, update, or delete admin users and manage their access.',
  },
  {
    code: ADMIN_PERMISSION_ASSIGN_ADMIN_ROLES,
    name: 'Assign Roles to Admin Users',
    description:
      'Grant or update roles and explicit permissions for admin users.',
  },
  {
    code: ADMIN_PERMISSION_EDIT_ROLES,
    name: 'Edit Roles',
    description: 'Create or update admin roles and their permissions.',
  },
  {
    code: ADMIN_PERMISSION_CREATE_ANNOUNCEMENTS,
    name: 'Create Platform Announcements',
    description: 'Publish announcements visible to platform users.',
  },
  {
    code: ADMIN_PERMISSION_TRIGGER_PAYOUTS,
    name: 'Trigger Payouts Manually',
    description:
      'Initiate payouts manually for pod members when automatic payouts are unavailable.',
  },
];
