export class SetAdminUserRolesCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly adminId: string,
    public readonly roleIds: string[],
  ) {}
}
