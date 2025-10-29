export class SetAdminRolePermissionsCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly roleId: string,
    public readonly permissionCodes: string[],
  ) {}
}
