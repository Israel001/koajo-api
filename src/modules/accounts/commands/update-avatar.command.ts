export class UpdateAvatarCommand {
  constructor(
    public readonly accountId: string,
    public readonly avatarUrl: string | null | undefined,
  ) {}
}
