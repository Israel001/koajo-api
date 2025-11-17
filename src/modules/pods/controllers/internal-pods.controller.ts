import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { PodMembershipEntity } from '../entities/pod-membership.entity';
import { PodEntity } from '../entities/pod.entity';
import { PodStatus } from '../pod-status.enum';
import { addDays, startOfDay } from '../pod.utils';

interface DueContributionItem {
  podId: string;
  planCode: string;
  amount: number;
  status: PodStatus;
  graceEndsAt: string | null;
  nextContributionDate: string | null;
  membershipId: string;
  user: {
    stripeCustomerId: string | null;
    stripePaymentMethodId: string | null;
  };
}

@Controller({ path: 'internal/pods', version: '1' })
export class InternalPodsController {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PodEntity)
    private readonly podRepository: EntityRepository<PodEntity>,
  ) {}

  @Get('due-contributions')
  async listDueContributions(
    @Headers('x-internal-secret') headerSecret: string | undefined,
    @Query('date') date: string | undefined,
  ): Promise<DueContributionItem[]> {
    const configSecret = this.configService.get<string>(
      'INTERNAL_SERVICE_SECRET',
    );

    if (!configSecret || !headerSecret || headerSecret !== configSecret) {
      throw new UnauthorizedException('Invalid internal secret.');
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      throw new BadRequestException('A valid date (YYYY-MM-DD) is required.');
    }

    const start = startOfDay(new Date(`${date}T00:00:00Z`));
    const end = addDays(start, 1);

    const memberships = await this.membershipRepository.find(
      {
        account: { $ne: null },
        pod: {
          nextContributionDate: {
            $gte: start,
            $lt: end,
          },
        },
      },
      { populate: ['pod', 'account'] as const },
    );

    return memberships
      .filter((membership) => membership.pod?.nextContributionDate)
      .map((membership) => {
        const pod = membership.pod!;
        const account = membership.account!;
        return {
          podId: pod.id,
          planCode: pod.planCode,
          amount: pod.amount,
          status: pod.status,
          graceEndsAt: pod.graceEndsAt?.toISOString() ?? null,
          nextContributionDate: pod.nextContributionDate?.toISOString() ?? null,
          membershipId: membership.id,
          user: {
            stripeCustomerId: account.stripeCustomerId ?? null,
            stripePaymentMethodId: account.stripePaymentMethodId ?? null,
          },
        } as DueContributionItem;
      });
  }
}
