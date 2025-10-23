import { AdminDashboardHandler } from './admin-dashboard.handler';
import { ListAdminAccountsHandler } from './list-admin-accounts.handler';
import { GetAdminAccountHandler } from './get-admin-account.handler';
import { ListAdminPodsHandler } from './list-admin-pods.handler';
import { GetAdminPodHandler } from './get-admin-pod.handler';
import { ListAdminUsersHandler } from './list-admin-users.handler';
import { ListAdminAchievementsHandler } from './list-admin-achievements.handler';

export const AdminQueryHandlers = [
  AdminDashboardHandler,
  ListAdminAccountsHandler,
  GetAdminAccountHandler,
  ListAdminPodsHandler,
  GetAdminPodHandler,
  ListAdminUsersHandler,
  ListAdminAchievementsHandler,
];

export {
  AdminDashboardHandler,
  ListAdminAccountsHandler,
  GetAdminAccountHandler,
  ListAdminPodsHandler,
  GetAdminPodHandler,
  ListAdminUsersHandler,
  ListAdminAchievementsHandler,
};
