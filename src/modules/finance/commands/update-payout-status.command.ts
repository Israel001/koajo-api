export class UpdatePayoutStatusCommand {
  constructor(
    public readonly payoutId: string,
    public readonly podId: string,
    public readonly status: 'success' | 'failed' | 'other',
    public readonly customStatus?: string | null,
  ) {}
}
