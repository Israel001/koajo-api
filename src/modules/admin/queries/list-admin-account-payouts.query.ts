export class ListAdminAccountPayoutsQuery {
  constructor(
    public readonly accountId: string,
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly status?: string | null,
    public readonly timeframe?: 'past' | 'upcoming' | null,
  ) {}
}
