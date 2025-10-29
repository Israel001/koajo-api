export class CreateAdminPermissionCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly payload: {
      code: string;
      name?: string | null;
      description?: string | null;
    },
  ) {}
}
