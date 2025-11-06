import { AnnouncementChannel } from '../announcement-channel.enum';
import { AnnouncementSeverity } from '../announcement-severity.enum';

export class CreateAdminAnnouncementCommand {
  constructor(
    public readonly adminId: string,
    public readonly channel: AnnouncementChannel,
    public readonly name: string,
    public readonly notificationTitle: string,
    public readonly message: string,
    public readonly severity: AnnouncementSeverity,
    public readonly sendToAll: boolean,
    public readonly accountIds: string[] | null,
    public readonly actionUrl: string | null,
    public readonly imageUrl: string | null,
  ) {}
}
