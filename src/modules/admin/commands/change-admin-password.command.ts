export class ChangeAdminPasswordCommand {
  constructor(
    public readonly adminId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
