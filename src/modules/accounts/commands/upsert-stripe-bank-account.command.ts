export class UpsertStripeBankAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly bankAccountId: string,
    public readonly customerId: string,
    public readonly bankName: string,
    public readonly accountFirstName: string,
    public readonly accountLastName: string,
    public readonly accountLast4: string,
  ) {}
}
