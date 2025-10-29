export class SetAdminUserPermissionsCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly adminId: string,
    public readonly payload: {
      allow: string[];
      deny: string[];
    },
  ) {}
}
