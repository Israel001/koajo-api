export class UpsertStripeCustomerCommand {
  constructor(
    public readonly accountId: string,
    public readonly stripeCustomerId: string,
    public readonly ssnLast4: string | null,
    public readonly address: Record<string, unknown> | null,
  ) {}
}
