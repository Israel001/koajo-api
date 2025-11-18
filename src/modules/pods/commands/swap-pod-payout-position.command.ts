export class SwapPodPayoutPositionCommand {
  constructor(
    public readonly podId: string,
    public readonly firstMembershipId: string,
    public readonly secondMembershipId: string,
  ) {}
}
