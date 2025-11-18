export class ListAdminPayoutsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly timeframe?: 'past' | 'upcoming' | null,
  ) {}
}
