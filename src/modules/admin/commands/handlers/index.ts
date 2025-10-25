import { AdminLoginHandler } from './admin-login.handler';
import { CreateAdminUserHandler } from './create-admin-user.handler';
import { CreateAdminPodPlanHandler } from './create-admin-pod-plan.handler';
import { UpdateAdminPodPlanHandler } from './update-admin-pod-plan.handler';
import { DeleteAdminPodPlanHandler } from './delete-admin-pod-plan.handler';

export const AdminCommandHandlers = [
  AdminLoginHandler,
  CreateAdminUserHandler,
  CreateAdminPodPlanHandler,
  UpdateAdminPodPlanHandler,
  DeleteAdminPodPlanHandler,
];

export { AdminLoginHandler } from './admin-login.handler';
export { CreateAdminUserHandler } from './create-admin-user.handler';
export { CreateAdminPodPlanHandler } from './create-admin-pod-plan.handler';
export { UpdateAdminPodPlanHandler } from './update-admin-pod-plan.handler';
export { DeleteAdminPodPlanHandler } from './delete-admin-pod-plan.handler';
