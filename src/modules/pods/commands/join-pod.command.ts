import { PodGoalType } from '../pod-goal.enum';

export class JoinPodCommand {
  constructor(
    public readonly accountId: string,
    public readonly planCode: string,
    public readonly goal: PodGoalType,
    public readonly goalNote?: string,
  ) {}
}
