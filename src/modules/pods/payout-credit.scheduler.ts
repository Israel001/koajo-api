import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodMembershipEntity } from './entities/pod-membership.entity';
import { PodEntity } from './entities/pod.entity';
import { AccountEntity } from '../accounts/entities/account.entity';
import { PayoutEntity } from '../finance/entities/payout.entity';
import { addDays, startOfDay } from './pod.utils';
import { InitiatePayoutCommand } from '../finance/commands/initiate-payout.command';

const ACTIVE_STATUSES = [
  'processing',
  'succeeded',
  'paid',
  'requires_action',
  'requires_payment_method',
  'requires_confirmation',
  'requires_capture',
  'pending',
];

@Injectable()
export class PayoutCreditScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PayoutCreditScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
  ) {}

  onModuleInit() {
    this.scheduleNextRun();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private scheduleNextRun(reference: Date = new Date()): void {
    const now = reference;
    const target = new Date(now);
    target.setUTCHours(10, 0, 0, 0); // 10 AM UTC

    if (target <= now) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const delay = Math.max(target.getTime() - now.getTime(), 1_000);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      void this.execute()
        .catch((error) =>
          this.logger.error(
            `Payout credit scheduler failed: ${(error as Error).message}`,
          ),
        )
        .finally(() => this.scheduleNextRun(new Date()));
    }, delay);
  }

  private async execute(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      const reference = new Date();
      await this.processDuePayouts(reference);
    });
  }

  private async processDuePayouts(reference: Date): Promise<void> {
    const dayStart = startOfDay(reference);
    const dayEnd = addDays(dayStart, 1);

    const memberships = await this.membershipRepository.find(
      {
        payoutDate: { $gte: dayStart, $lt: dayEnd },
        paidOut: false,
        account: { $ne: null },
      },
      { populate: ['account', 'pod'] as const },
    );

    for (const membership of memberships) {
      const account = membership.account;
      const pod = membership.pod;
      if (!account || !pod) {
        continue;
      }

      if (
        account.requiresFraudReview ||
        account.missedPaymentFlag ||
        account.overheatFlag
      ) {
        continue;
      }

      const active = await this.payoutRepository.findOne({
        membership,
        status: { $in: ACTIVE_STATUSES },
      });
      if (active) {
        continue;
      }

      try {
        await this.commandBus.execute(
          new InitiatePayoutCommand(membership.id, false, 'scheduler'),
        );
      } catch (error) {
        this.logger.warn(
          `Payout initiation failed for membership ${membership.id}: ${(error as Error).message}`,
        );
      }
    }
  }
}
