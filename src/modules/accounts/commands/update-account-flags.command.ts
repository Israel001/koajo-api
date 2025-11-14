export class UpdateAccountFlagsCommand {
  constructor(
    public readonly accountId: string,
    public readonly fraudReview?: boolean,
    public readonly missedPayment?: boolean,
    public readonly overheat?: boolean,
  ) {}
}
