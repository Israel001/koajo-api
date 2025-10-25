import { AdminRole } from '../admin-role.enum';

export interface UpdateAdminPodPlanPayload {
  code?: string;
  amount?: number;
  lifecycleWeeks?: number;
  maxMembers?: number;
  active?: boolean;
}

export class UpdateAdminPodPlanCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      role: AdminRole;
      isSuperAdmin: boolean;
    },
    public readonly planId: string,
    public readonly payload: UpdateAdminPodPlanPayload,
  ) {}
}
