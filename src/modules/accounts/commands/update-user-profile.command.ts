export class UpdateUserProfileCommand {
  constructor(
    public readonly accountId: string,
    public readonly firstName?: string | null,
    public readonly lastName?: string | null,
    public readonly dateOfBirth?: string | null,
    public readonly phoneNumber?: string | null,
    public readonly verificationRedirectBaseUrl: string | null = null,
  ) {}
}
