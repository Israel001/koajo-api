export class UpsertStripeBankAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly bankAccountId: string,
    public readonly customerId: string,
  ) {}
}
