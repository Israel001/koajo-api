export class CreateAdminRoleCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly payload: {
      name: string;
      description?: string | null;
      permissionCodes?: string[];
    },
  ) {}
}
