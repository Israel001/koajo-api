export class ListPodActivitiesQuery {
  constructor(
    public readonly podId: string,
    public readonly accountId: string,
    public readonly limit: number,
  ) {}
}
