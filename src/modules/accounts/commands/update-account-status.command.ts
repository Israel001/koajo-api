export class UpdateAccountStatusCommand {
  constructor(
    public readonly accountId: string,
    public readonly isActive: boolean,
  ) {}
}
