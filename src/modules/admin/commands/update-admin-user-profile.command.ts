export class UpdateAdminUserProfileCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly targetAdminId: string,
    public readonly payload: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
      isActive?: boolean | null;
    },
  ) {}
}
