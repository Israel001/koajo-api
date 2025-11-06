export class ResendEmailVerificationCommand {
  constructor(
    public readonly email: string,
    public readonly redirectBaseUrl: string | null = null,
  ) {}
}
