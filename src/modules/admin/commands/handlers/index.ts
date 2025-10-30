import { AdminLoginHandler } from './admin-login.handler';
import { CreateAdminUserHandler } from './create-admin-user.handler';
import { CreateAdminPodPlanHandler } from './create-admin-pod-plan.handler';
import { UpdateAdminPodPlanHandler } from './update-admin-pod-plan.handler';
import { DeleteAdminPodPlanHandler } from './delete-admin-pod-plan.handler';
import { CreateAdminRoleHandler } from './create-admin-role.handler';
import { SetAdminRolePermissionsHandler } from './set-admin-role-permissions.handler';
import { UpdateAdminUserProfileHandler } from './update-admin-user-profile.handler';
import { DeleteAdminUserHandler } from './delete-admin-user.handler';
import { SetAdminUserRolesHandler } from './set-admin-user-roles.handler';
import { SetAdminUserPermissionsHandler } from './set-admin-user-permissions.handler';
import { ChangeAdminPasswordHandler } from './change-admin-password.handler';
import { AdminForgotPasswordHandler } from './admin-forgot-password.handler';
import { AdminResetPasswordHandler } from './admin-reset-password.handler';

export const AdminCommandHandlers = [
  AdminLoginHandler,
  CreateAdminUserHandler,
  CreateAdminPodPlanHandler,
  UpdateAdminPodPlanHandler,
  DeleteAdminPodPlanHandler,
  CreateAdminRoleHandler,
  SetAdminRolePermissionsHandler,
  UpdateAdminUserProfileHandler,
  DeleteAdminUserHandler,
  SetAdminUserRolesHandler,
  SetAdminUserPermissionsHandler,
  ChangeAdminPasswordHandler,
  AdminForgotPasswordHandler,
  AdminResetPasswordHandler,
];

export { AdminLoginHandler } from './admin-login.handler';
export { CreateAdminUserHandler } from './create-admin-user.handler';
export { CreateAdminPodPlanHandler } from './create-admin-pod-plan.handler';
export { UpdateAdminPodPlanHandler } from './update-admin-pod-plan.handler';
export { DeleteAdminPodPlanHandler } from './delete-admin-pod-plan.handler';
export { CreateAdminRoleHandler } from './create-admin-role.handler';
export { SetAdminRolePermissionsHandler } from './set-admin-role-permissions.handler';
export { UpdateAdminUserProfileHandler } from './update-admin-user-profile.handler';
export { DeleteAdminUserHandler } from './delete-admin-user.handler';
export { SetAdminUserRolesHandler } from './set-admin-user-roles.handler';
export { SetAdminUserPermissionsHandler } from './set-admin-user-permissions.handler';
export { ChangeAdminPasswordHandler } from './change-admin-password.handler';
export { AdminForgotPasswordHandler } from './admin-forgot-password.handler';
export { AdminResetPasswordHandler } from './admin-reset-password.handler';
