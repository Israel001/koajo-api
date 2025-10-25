import { AdminRole } from '../admin-role.enum';

export interface AdminPodPlanPayload {
  code: string;
  amount: number;
  lifecycleWeeks: number;
  maxMembers: number;
  active?: boolean;
}

export class CreateAdminPodPlanCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      role: AdminRole;
      isSuperAdmin: boolean;
    },
    public readonly payload: AdminPodPlanPayload,
  ) {}
}
