export class RegisterAccountCommand {
  constructor(
    public readonly email: string,
    public readonly phoneNumber: string,
    public readonly password: string,
    public readonly avatarUrl?: string | null,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly dateOfBirth?: Date | null,
    public readonly address?: Record<string, unknown> | null,
    public readonly metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {}
}
