export class UpdateNotificationPreferencesCommand {
  constructor(
    public readonly accountId: string,
    public readonly emailNotificationsEnabled?: boolean,
    public readonly transactionNotificationsEnabled?: boolean,
  ) {}
}
