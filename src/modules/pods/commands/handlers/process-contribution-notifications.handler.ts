import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ProcessContributionNotificationsCommand } from '../process-contribution-notifications.command';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { CustomPodCadence } from '../../custom-pod-cadence.enum';
import { PodStatus } from '../../pod-status.enum';
import { PodType } from '../../pod-type.enum';
import { addDays, isWithinContributionWindow, resolveContributionWindowStart } from '../../pod.utils';
import { PaymentEntity } from '../../../finance/entities/payment.entity';
import { isSuccessfulPaymentStatus } from '../../../achievements/achievement.helpers';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { InAppNotificationMessages } from '../../../notifications/in-app-notification.messages';

@CommandHandler(ProcessContributionNotificationsCommand)
export class ProcessContributionNotificationsHandler
  implements ICommandHandler<ProcessContributionNotificationsCommand, void>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(
    command: ProcessContributionNotificationsCommand,
  ): Promise<void> {
    const reference = command.reference ?? new Date();
    await this.handleCadence(CustomPodCadence.BI_WEEKLY, reference);
    await this.handleCadence(CustomPodCadence.MONTHLY, reference);
  }

  private async handleCadence(
    cadence: CustomPodCadence,
    reference: Date,
  ): Promise<void> {
    if (!isWithinContributionWindow(reference, cadence)) {
      return;
    }

    const memberships = await this.membershipRepository.find(
      this.buildCriteria(cadence),
      { populate: ['account', 'pod'] as const },
    );

    if (!memberships.length) {
      return;
    }

    const windowStart = resolveContributionWindowStart(reference, cadence);
    const windowEnd = addDays(windowStart, 3);
    const membershipIds = memberships.map((membership) => membership.id);

    const payments = await this.paymentRepository.find(
      {
        membership: { $in: membershipIds },
        createdAt: { $gte: windowStart, $lt: windowEnd },
      },
      { populate: ['membership'] as const },
    );

    const chargedMemberships = new Set(
      payments
        .filter((payment) => isSuccessfulPaymentStatus(payment.status))
        .map((payment) => payment.membership.id),
    );

    for (const membership of memberships) {
      const account = membership.account;
      if (!account || chargedMemberships.has(membership.id)) {
        continue;
      }

      const pod = membership.pod;
      if (!pod || pod.startDate === null) {
        continue;
      }

      if (pod.startDate > windowStart || membership.joinedAt > windowStart) {
        continue;
      }

      const context = `contribution_due:${membership.id}:${windowStart.toISOString()}`;
      await this.inAppNotificationService.createIfNotExists(
        account,
        InAppNotificationMessages.contributionDue(),
        context,
      );
    }
  }

  private buildCriteria(cadence: CustomPodCadence) {
    if (cadence === CustomPodCadence.MONTHLY) {
      return {
        isSystemBot: false,
        paidOut: false,
        account: { $ne: null },
        pod: {
          status: PodStatus.ACTIVE,
          type: PodType.CUSTOM,
          cadence: CustomPodCadence.MONTHLY,
        },
      };
    }

    return {
      isSystemBot: false,
      paidOut: false,
      account: { $ne: null },
      $or: [
        {
          pod: {
            status: PodStatus.ACTIVE,
            type: PodType.SYSTEM,
          },
        },
        {
          pod: {
            status: PodStatus.ACTIVE,
            type: PodType.CUSTOM,
            cadence: CustomPodCadence.BI_WEEKLY,
          },
        },
      ],
    };
  }
}
