import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminAnnouncementEntity } from '../../entities/admin-announcement.entity';
import { ListAdminAnnouncementsQuery } from '../list-admin-announcements.query';
import {
  AdminAnnouncementResult,
  AdminAnnouncementsListResult,
} from '../../contracts/admin-results';
import { AdminAnnouncementRecipientEntity } from '../../entities/admin-announcement-recipient.entity';
import { AccountEntity } from '../../../accounts/entities/account.entity';

type RecipientCountRow = {
  announcement_id?: string;
  announcement?: string;
  recipient_count?: string | number;
  count?: string | number;
};

@QueryHandler(ListAdminAnnouncementsQuery)
export class ListAdminAnnouncementsHandler
  implements
    IQueryHandler<ListAdminAnnouncementsQuery, AdminAnnouncementsListResult>
{
  constructor(
    @InjectRepository(AdminAnnouncementEntity)
    private readonly announcementRepository: EntityRepository<AdminAnnouncementEntity>,
    @InjectRepository(AdminAnnouncementRecipientEntity)
    private readonly recipientRepository: EntityRepository<AdminAnnouncementRecipientEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(
    query: ListAdminAnnouncementsQuery,
  ): Promise<AdminAnnouncementsListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const searchTerm = query.search?.trim();

    const where = searchTerm
      ? {
          $or: [
            { name: { $like: `%${searchTerm}%` } },
            { notificationTitle: { $like: `%${searchTerm}%` } },
            { message: { $like: `%${searchTerm}%` } },
          ],
        }
      : {};

    const [announcements, total] = await this.announcementRepository.findAndCount(
      where,
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    const targetedIds = announcements
      .filter((announcement) => !announcement.sendToAll)
      .map((announcement) => announcement.id);

    const recipientCounts = await this.loadRecipientCounts(targetedIds);
    const globalRecipientCount = await this.resolveGlobalRecipientCount(
      announcements,
    );

    const items: AdminAnnouncementResult[] = announcements.map(
      (announcement) => ({
        id: announcement.id,
        name: announcement.name,
        channel: announcement.channel,
        severity: announcement.severity,
        notificationTitle: announcement.notificationTitle,
        sendToAll: announcement.sendToAll,
        actionUrl: announcement.actionUrl ?? null,
        imageUrl: announcement.imageUrl ?? null,
        totalRecipients: announcement.sendToAll
          ? globalRecipientCount
          : recipientCounts.get(announcement.id) ?? 0,
        createdAt: announcement.createdAt.toISOString(),
      }),
    );

    return { total, items };
  }

  private async loadRecipientCounts(
    announcementIds: string[],
  ): Promise<Map<string, number>> {
    if (!announcementIds.length) {
      return new Map();
    }

    const rows = (await this.recipientRepository
      .createQueryBuilder('recipient')
      .select([
        'recipient.announcement_id as announcement_id',
        'count(recipient.id) as recipient_count',
      ])
      .where({ announcement: { $in: announcementIds } })
      .groupBy('recipient.announcement_id')
      .execute('all')) as RecipientCountRow[];

    const counts = new Map<string, number>();
    for (const row of rows) {
      const announcementId = String(
        row.announcement_id ?? row.announcement ?? '',
      );
      if (!announcementId) {
        continue;
      }
      const countValue = Number(row.recipient_count ?? row.count ?? 0);
      counts.set(announcementId, countValue);
    }
    return counts;
  }

  private async resolveGlobalRecipientCount(
    announcements: AdminAnnouncementEntity[],
  ): Promise<number> {
    const requiresGlobalCount = announcements.some(
      (announcement) => announcement.sendToAll,
    );

    if (!requiresGlobalCount) {
      return 0;
    }

    return this.accountRepository.count();
  }
}
