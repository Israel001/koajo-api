export class CompleteStripeVerificationCommand {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly stripeVerificationCompleted: boolean,
    public readonly verificationAttemptCount?: number | null,
    public readonly verificationFirstAttemptDate?: Date | null,
    public readonly verificationLastAttemptDate?: Date | null,
    public readonly verificationStatus?: string | null,
  ) {}
}
