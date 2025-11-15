import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountNotificationEntity } from '../accounts/entities/account-notification.entity';
import type { AccountEntity } from '../accounts/entities/account.entity';

export interface InAppNotificationPayload {
  title: string;
  body: string;
  severity: string;
  actionUrl?: string | null;
  context?: string | null;
}

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectRepository(AccountNotificationEntity)
    private readonly notificationRepository: EntityRepository<AccountNotificationEntity>,
  ) {}

  async createNotification(
    account: AccountEntity,
    payload: InAppNotificationPayload,
  ): Promise<void> {
    await this.createMany([
      {
        account,
        ...payload,
      },
    ]);
  }

  async createIfNotExists(
    account: AccountEntity,
    payload: InAppNotificationPayload,
    context: string,
  ): Promise<void> {
    const existing = await this.notificationRepository.findOne({
      account,
      context,
    });

    if (existing) {
      return;
    }

    await this.createNotification(account, {
      ...payload,
      context,
    });
  }

  async createMany(
    items: Array<InAppNotificationPayload & { account: AccountEntity }>,
  ): Promise<void> {
    if (!items.length) {
      return;
    }

    const em = this.notificationRepository.getEntityManager();

    for (const item of items) {
      const notification = this.notificationRepository.create(
        {
          account: item.account,
          title: item.title,
          body: item.body,
          severity: item.severity,
          actionUrl: item.actionUrl ?? null,
          context: item.context ?? null,
        },
        { partial: true },
      );

      em.persist(notification);
    }

    await em.flush();
  }
}
