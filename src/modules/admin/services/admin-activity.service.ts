import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminActivityEntity } from '../entities/admin-activity.entity';
import { AdminActivityAction } from '../admin-activity-action.enum';

@Injectable()
export class AdminActivityService {
  constructor(
    @InjectRepository(AdminActivityEntity)
    private readonly activityRepository: EntityRepository<AdminActivityEntity>,
  ) {}

  async record(
    action: AdminActivityAction,
    adminId: string | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<AdminActivityEntity> {
    const actorId = adminId?.trim().length ? adminId.trim() : 'super-admin';

    const activity = this.activityRepository.create({
      adminId: actorId,
      action,
      createdAt: new Date(),
      metadata: metadata ?? null,
    });

    const em = this.activityRepository.getEntityManager();
    await em.persistAndFlush(activity);

    return activity;
  }
}
