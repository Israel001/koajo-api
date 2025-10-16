export class RegisterAccountCommand {
  constructor(
    public readonly email: string,
    public readonly phoneNumber: string,
    public readonly password: string,
    public readonly metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {}
}
