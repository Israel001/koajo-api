import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import type { AccountEntity } from '../../accounts/entities/account.entity';
import type { PodEntity } from '../entities/pod.entity';
import type { PodMembershipEntity } from '../entities/pod-membership.entity';
import { PodActivityEntity } from '../entities/pod-activity.entity';
import { PodActivityType } from '../pod-activity-type.enum';

interface RecordActivityParams {
  pod: PodEntity;
  type: PodActivityType;
  membership?: PodMembershipEntity | null;
  account?: AccountEntity | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class PodActivityService {
  constructor(
    @InjectRepository(PodActivityEntity)
    private readonly activityRepository: EntityRepository<PodActivityEntity>,
  ) {}

  async recordActivity({
    pod,
    membership = null,
    account = null,
    type,
    metadata = null,
  }: RecordActivityParams): Promise<void> {
    const activity = this.activityRepository.create(
      {
        pod,
        membership: membership ?? undefined,
        account: account ?? undefined,
        type,
        metadata,
      },
      { partial: true },
    );

    const em = this.activityRepository.getEntityManager();
    em.persist(activity);
    await em.flush();
  }
}
