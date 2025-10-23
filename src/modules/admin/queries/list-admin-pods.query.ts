export class ListAdminPodsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}
