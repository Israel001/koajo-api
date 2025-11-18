export class ListPodPaymentsQuery {
  constructor(
    public readonly podId: string,
    public readonly accountId: string,
    public readonly limit: number,
    public readonly offset: number = 0,
  ) {}
}
