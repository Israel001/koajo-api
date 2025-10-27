export class RecordIdentityVerificationCommand {
  constructor(
    public readonly accountId: string,
    public readonly identityId: string,
    public readonly sessionId: string,
    public readonly resultId: string,
    public readonly status: string,
    public readonly type: string,
  ) {}
}
