import { AdminDashboardHandler } from './admin-dashboard.handler';
import { ListAdminAccountsHandler } from './list-admin-accounts.handler';
import { GetAdminAccountHandler } from './get-admin-account.handler';
import { ListAdminPodsHandler } from './list-admin-pods.handler';
import { GetAdminPodHandler } from './get-admin-pod.handler';
import { ListAdminUsersHandler } from './list-admin-users.handler';
import { ListAdminAchievementsHandler } from './list-admin-achievements.handler';
import { ListAdminPodPlansHandler } from './list-admin-pod-plans.handler';
import { ListAdminPodActivitiesHandler } from './list-admin-pod-activities.handler';

export const AdminQueryHandlers = [
  AdminDashboardHandler,
  ListAdminAccountsHandler,
  GetAdminAccountHandler,
  ListAdminPodsHandler,
  GetAdminPodHandler,
  ListAdminUsersHandler,
  ListAdminAchievementsHandler,
  ListAdminPodPlansHandler,
  ListAdminPodActivitiesHandler,
];

export {
  AdminDashboardHandler,
  ListAdminAccountsHandler,
  GetAdminAccountHandler,
  ListAdminPodsHandler,
  GetAdminPodHandler,
  ListAdminUsersHandler,
  ListAdminAchievementsHandler,
  ListAdminPodPlansHandler,
  ListAdminPodActivitiesHandler,
};
