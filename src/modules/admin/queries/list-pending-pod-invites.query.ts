export class ListPendingPodInvitesQuery {
  constructor(
    public readonly limit: number,
    public readonly offset: number,
  ) {}
}
