export class UpdateAdminRoleCommand {
  constructor(
    public readonly roleId: string,
    public readonly name: string | null,
    public readonly description: string | null,
  ) {}
}
