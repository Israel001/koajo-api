export class DeleteAdminUserCommand {
  constructor(
    public readonly requester: {
      adminId: string | null;
      isSuperAdmin: boolean;
    },
    public readonly targetAdminId: string,
  ) {}
}
