export class ListOpenPodsForPlanQuery {
  constructor(
    public readonly planCode: string,
    public readonly reference?: Date,
  ) {}
}
