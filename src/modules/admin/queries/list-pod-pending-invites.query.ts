export class ListPodPendingInvitesQuery {
  constructor(
    public readonly podId: string,
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
