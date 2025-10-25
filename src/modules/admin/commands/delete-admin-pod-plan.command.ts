import { AdminRole } from '../admin-role.enum';

export class DeleteAdminPodPlanCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      role: AdminRole;
      isSuperAdmin: boolean;
    },
    public readonly planId: string,
  ) {}
}
