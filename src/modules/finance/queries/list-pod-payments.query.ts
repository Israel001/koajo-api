export class ListPodPaymentsQuery {
  constructor(
    public readonly podId: string,
    public readonly accountId: string,
    public readonly limit: number,
    public readonly offset: number = 0,
    public readonly status?: string | null,
    public readonly timeframe?: 'past' | 'upcoming' | null,
    public readonly from?: string | null,
    public readonly to?: string | null,
    public readonly sort?: 'asc' | 'desc' | null,
  ) {}
}
