import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomUUID } from 'crypto';
import { ChecksumService } from '../../common/security/checksum.service';
import {
  DEFAULT_POD_PLANS,
  POD_GRACE_PERIOD_DAYS,
  POD_OPEN_STATUSES,
} from './pod.constants';
import { PodPlanEntity } from './entities/pod-plan.entity';
import { PodEntity } from './entities/pod.entity';
import { PodMembershipEntity } from './entities/pod-membership.entity';
import type { PodWithMembers } from './types';
import { PodStatus } from './pod-status.enum';
import {
  addDays,
  computeNextStartDate,
  generatePayoutSchedule,
  nextStartWindow,
  shuffle,
  startOfDay,
} from './pod.utils';
import { PodType } from './pod-type.enum';

const OPEN_PODS_CACHE_TTL_MS = 30_000;

@Injectable()
export class PodDomainHelper {
  constructor(
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodPlanEntity)
    private readonly planRepository: EntityRepository<PodPlanEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  private openPodsCache: {
    timestamp: number;
    data: PodWithMembers[];
  } | null = null;

  async seedPlansIfEmpty(): Promise<void> {
    const count = await this.planRepository.count();
    if (count > 0) {
      return;
    }

    const plans = DEFAULT_POD_PLANS.map((plan) =>
      this.planRepository.create(
        {
          id: randomUUID(),
          code: plan.code,
          amount: plan.amount,
          lifecycleWeeks: plan.lifecycleWeeks,
          maxMembers: plan.maxMembers,
          active: plan.active,
        },
        { partial: true },
      ),
    );

    await this.planRepository.getEntityManager().persistAndFlush(plans);
  }

  async getActivePlans(): Promise<PodPlanEntity[]> {
    await this.seedPlansIfEmpty();
    return this.planRepository.find(
      { active: true },
      { orderBy: { amount: 'ASC', lifecycleWeeks: 'ASC' } },
    );
  }

  async getPlanOrFail(code: string): Promise<PodPlanEntity> {
    await this.seedPlansIfEmpty();
    const plan = await this.planRepository.findOne({ code, active: true });
    if (!plan) {
      throw new NotFoundException('Pod plan not found.');
    }
    return plan;
  }

  invalidateOpenPodsCache(): void {
    this.openPodsCache = null;
  }

  async loadOpenPods(reference: Date): Promise<PodWithMembers[]> {
    const cached = this.getCachedOpenPods(reference);
    if (cached) {
      return cached;
    }

    const pods = (await this.podRepository.find(
      { status: { $in: POD_OPEN_STATUSES }, type: PodType.SYSTEM },
      {
        orderBy: { scheduledStartDate: 'ASC' },
        populate: ['memberships', 'memberships.account'] as const,
      },
    )) as PodWithMembers[];

    this.openPodsCache = {
      timestamp: reference.getTime(),
      data: pods,
    };

    return pods;
  }

  private getCachedOpenPods(reference: Date): PodWithMembers[] | null {
    if (!this.openPodsCache) {
      return null;
    }

    if (reference.getTime() - this.openPodsCache.timestamp > OPEN_PODS_CACHE_TTL_MS) {
      return null;
    }

    return this.openPodsCache.data;
  }

  async ensurePlanLifecycle(plan: PodPlanEntity, reference: Date): Promise<void> {
    const pods = (await this.podRepository.find(
      { planCode: plan.code, type: PodType.SYSTEM },
      { populate: ['memberships', 'memberships.account'] as const },
    )) as PodWithMembers[];

    let openPod = pods.find((pod) => POD_OPEN_STATUSES.includes(pod.status));

    if (!openPod) {
      openPod = await this.createOpenPod(plan, reference);
      pods.push(openPod);
    }

    await this.updatePodLifecycle(openPod, plan, reference);

    for (const pod of pods) {
      if (pod !== openPod && pod.status === PodStatus.GRACE) {
        await this.updatePodLifecycle(pod, plan, reference);
      }
    }
  }

  calculateTotalContributionTarget(plan: PodPlanEntity): string {
    const cycles = Math.ceil(plan.lifecycleWeeks / 2);
    return (plan.amount * cycles).toFixed(2);
  }

  calculateContributionProgress(
    membership: PodMembershipEntity,
    plan: PodPlanEntity,
  ): number {
    const target = parseFloat(this.calculateTotalContributionTarget(plan));
    if (!target) {
      return 0;
    }

    const contributed = parseFloat(membership.totalContributed ?? '0');
    const percentage = parseFloat(((contributed / target) * 100).toFixed(2));
    if (!Number.isFinite(percentage)) {
      return 0;
    }
    return Math.min(100, Math.max(0, percentage));
  }

  private async createOpenPod(
    plan: PodPlanEntity,
    reference: Date,
  ): Promise<PodWithMembers> {
    this.invalidateOpenPodsCache();
    const pod = this.podRepository.create(
      {
        type: PodType.SYSTEM,
        planCode: plan.code,
        amount: plan.amount,
        lifecycleWeeks: plan.lifecycleWeeks,
        maxMembers: plan.maxMembers,
        status: PodStatus.OPEN,
        scheduledStartDate: computeNextStartDate(reference),
      },
      { partial: true },
    );

    this.applyChecksum(pod);
    await this.podRepository.getEntityManager().persistAndFlush(pod);

    return (await this.podRepository.findOneOrFail(
      { id: pod.id },
      { populate: ['memberships', 'memberships.account'] as const },
    )) as PodWithMembers;
  }

  private async updatePodLifecycle(
    pod: PodWithMembers,
    plan: PodPlanEntity,
    reference: Date,
  ): Promise<void> {
    await pod.memberships.init();
    this.assertChecksum(pod);

    const now = startOfDay(reference);

    if (pod.status === PodStatus.OPEN) {
      const memberCount = pod.memberships.length;
      const scheduledStart = pod.scheduledStartDate;
      if (!scheduledStart) {
        throw new BadRequestException('System pod has no scheduled start date.');
      }

      if (memberCount === 0 && now >= startOfDay(scheduledStart)) {
        pod.scheduledStartDate = nextStartWindow(scheduledStart);
        this.applyChecksum(pod);
        await this.podRepository.getEntityManager().flush();
        this.invalidateOpenPodsCache();
        return;
      }

      if (memberCount > 0 && now >= startOfDay(scheduledStart)) {
        pod.status = PodStatus.GRACE;
        pod.startDate = scheduledStart;
        pod.graceEndsAt = addDays(scheduledStart, POD_GRACE_PERIOD_DAYS);
        this.applyChecksum(pod);
        await this.podRepository.getEntityManager().flush();
        this.invalidateOpenPodsCache();
      }
      return;
    }

    if (pod.status === PodStatus.GRACE) {
      const baselineStart = pod.startDate ?? pod.scheduledStartDate;
      if (!baselineStart) {
        throw new BadRequestException('Pod start date is not defined.');
      }

      pod.startDate = baselineStart;

      if (pod.memberships.length === 0) {
        pod.status = PodStatus.OPEN;
        pod.startDate = null;
        pod.graceEndsAt = null;
        pod.scheduledStartDate = nextStartWindow(reference);
        this.applyChecksum(pod);
        await this.podRepository.getEntityManager().flush();
        this.invalidateOpenPodsCache();
        return;
      }

      if (!pod.graceEndsAt) {
        pod.graceEndsAt = addDays(baselineStart, POD_GRACE_PERIOD_DAYS);
      }

      if (pod.graceEndsAt && now > startOfDay(pod.graceEndsAt)) {
        await this.lockPod(pod, plan, reference);
      }
    }
  }

  private async lockPod(
    pod: PodWithMembers,
    plan: PodPlanEntity,
    reference: Date,
  ): Promise<void> {
    const membershipManager = this.membershipRepository.getEntityManager();
    await pod.memberships.init();

    const now = startOfDay(reference);
    pod.status = PodStatus.ACTIVE;
    pod.lockedAt = now;
    this.invalidateOpenPodsCache();

    const currentMembers = pod.memberships.getItems();
    const bots = currentMembers.filter((member) => member.isSystemBot);
    const actualMembers = currentMembers.filter((member) => !member.isSystemBot);

    const missingSlots = plan.maxMembers - currentMembers.length;

    for (let index = 0; index < missingSlots; index += 1) {
      const bot = this.membershipRepository.create(
        {
          pod,
          account: null,
          isSystemBot: true,
          joinOrder: currentMembers.length + index + 1,
          joinedAt: now,
        },
        { partial: true },
      );
      membershipManager.persist(bot);
      bots.push(bot);
    }

    await membershipManager.flush();
    await pod.memberships.init();

    const updatedMembers = pod.memberships.getItems();
    const botMembers = updatedMembers.filter((member) => member.isSystemBot);
    const realMembers = updatedMembers.filter((member) => !member.isSystemBot);

    const orderedRealMembers = shuffle(realMembers);
    const finalOrder = [...botMembers, ...orderedRealMembers];
    const schedule = pod.startDate
      ? generatePayoutSchedule(pod.startDate, finalOrder.length)
      : [];

    finalOrder.forEach((member, index) => {
      member.finalOrder = index + 1;
      member.payoutDate = schedule[index] ?? null;
    });

    this.applyChecksum(pod);
    await membershipManager.flush();
    this.invalidateOpenPodsCache();
  }

  private computeChecksum(pod: PodEntity): string {
    return this.checksumService.generate(
      'pods:state',
      pod.id,
      pod.planCode,
      pod.amount,
      pod.lifecycleWeeks,
      pod.maxMembers,
      pod.status,
      pod.scheduledStartDate?.toISOString() ?? '',
      pod.startDate?.toISOString() ?? '',
      pod.graceEndsAt?.toISOString() ?? '',
      pod.lockedAt?.toISOString() ?? '',
      pod.completedAt?.toISOString() ?? '',
      pod.cyclesCompleted,
    );
  }

  private assertChecksum(pod: PodEntity): void {
    if (!pod.checksum) {
      return;
    }
    const expected = this.computeChecksum(pod);
    if (pod.checksum !== expected) {
      throw new BadRequestException('Pod state checksum mismatch.');
    }
  }

  private applyChecksum(pod: PodEntity): void {
    pod.checksum = this.computeChecksum(pod);
  }
}
