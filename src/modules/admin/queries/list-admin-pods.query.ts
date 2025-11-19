export class ListAdminPodsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly search?: string | null,
    public readonly status?: string | null,
    public readonly incompleteOnly?: boolean,
    public readonly hasMembers?: boolean | null,
  ) {}
}
