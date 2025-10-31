import { CustomPodCadence } from '../custom-pod-cadence.enum';

export class CreateCustomPodCommand {
  constructor(
    public readonly creatorAccountId: string,
    public readonly name: string,
    public readonly amount: number,
    public readonly cadence: CustomPodCadence,
    public readonly randomizePositions: boolean,
    public readonly inviteEmails: string[],
  ) {}
}
