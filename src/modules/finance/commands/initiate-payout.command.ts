export class InitiatePayoutCommand {
  constructor(
    public readonly membershipId: string,
    public readonly initiatedByAdmin: boolean = false,
    public readonly description: string | null = 'payout-initiation',
  ) {}
}
