export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly rememberMe: boolean = false,
    public readonly metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ) {}
}
