export class ListAdminAccountsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly search?: string,
  ) {}
}
