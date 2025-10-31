export class ListAccountPodActivitiesQuery {
  constructor(
    public readonly accountId: string,
    public readonly limit: number,
    public readonly offset: number = 0,
  ) {}
}
