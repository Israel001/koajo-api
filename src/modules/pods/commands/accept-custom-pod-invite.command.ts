export class AcceptCustomPodInviteCommand {
  constructor(
    public readonly accountId: string,
    public readonly token: string,
  ) {}
}
