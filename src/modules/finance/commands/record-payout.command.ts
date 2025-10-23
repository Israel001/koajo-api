export class RecordPayoutCommand {
  constructor(
    public readonly accountId: string,
    public readonly podId: string,
    public readonly stripeReference: string,
    public readonly amount: number,
    public readonly fee: number,
    public readonly currency: string,
    public readonly status: string,
    public readonly description: string | null,
  ) {}
}
