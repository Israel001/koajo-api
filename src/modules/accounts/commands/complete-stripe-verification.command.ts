export class CompleteStripeVerificationCommand {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly stripeVerificationCompleted: boolean,
    public readonly sessionId: string,
    public readonly stripeReference: string,
    public readonly verificationType: string,
    public readonly verificationStatus: string,
  ) {}
}
