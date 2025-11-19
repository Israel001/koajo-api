export class MarkPodMembershipPaidCommand {
  constructor(
    public readonly podId: string,
    public readonly membershipId: string,
    public readonly amount: number,
    public readonly paidAt?: Date | null,
    public readonly description?: string | null,
  ) {}
}
