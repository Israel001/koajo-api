import { AdminRole } from '../admin-role.enum';

export class CreateAdminUserCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      role: AdminRole;
      isSuperAdmin: boolean;
    },
    public readonly email: string,
    public readonly password: string,
    public readonly role: AdminRole,
  ) {}
}
