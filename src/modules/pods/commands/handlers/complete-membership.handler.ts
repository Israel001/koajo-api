import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CompleteMembershipCommand } from '../complete-membership.command';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { AchievementService } from '../../../achievements/achievements.service';
import { ChecksumService } from '../../../../common/security/checksum.service';
import { PodType } from '../../pod-type.enum';
import { PodStatus } from '../../pod-status.enum';
import { computeCustomPodChecksum } from '../../custom-pod-integrity.util';
import { PodActivityService } from '../../services/pod-activity.service';
import { PodActivityType } from '../../pod-activity-type.enum';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { InAppNotificationMessages } from '../../../notifications/in-app-notification.messages';

@CommandHandler(CompleteMembershipCommand)
export class CompleteMembershipHandler
  implements ICommandHandler<CompleteMembershipCommand, void>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly achievementService: AchievementService,
    private readonly checksumService: ChecksumService,
    private readonly activityService: PodActivityService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(command: CompleteMembershipCommand): Promise<void> {
    const membership = await this.membershipRepository.findOne(
      { id: command.membershipId },
      { populate: ['account', 'pod'] as const },
    );

    if (!membership) {
      throw new NotFoundException('Pod membership not found.');
    }

    if (!membership.account) {
      throw new NotFoundException('Pod membership is not linked to an account.');
    }

    if (membership.isSystemBot) {
      throw new BadRequestException('System bots do not participate in achievements.');
    }

    if (membership.paidOut) {
      return;
    }

    membership.paidOut = true;

    const target = this.calculateTotalContributionTarget(membership);
    membership.totalContributed = target;

    const em = this.membershipRepository.getEntityManager();
    await membership.pod.memberships.init({ populate: ['account'] });

    const allPaid = membership.pod.memberships
      .getItems()
      .filter((item) => !item.isSystemBot)
      .every((item) => item.paidOut);

    if (allPaid) {
      membership.pod.status = PodStatus.COMPLETED;
      membership.pod.completedAt = new Date();
      membership.pod.nextContributionDate = null;
      membership.pod.nextPayoutDate = null;
    }

    if (membership.pod.type === PodType.CUSTOM) {
      membership.pod.checksum = computeCustomPodChecksum(
        this.checksumService,
        membership.pod,
      );
    }

    await em.persistAndFlush([membership, membership.pod]);

    await this.activityService.recordActivity({
      pod: membership.pod,
      membership,
      account: membership.account,
      type: PodActivityType.MEMBERSHIP_COMPLETED,
      metadata: {
        finalOrder: membership.finalOrder,
        payoutDate: membership.payoutDate?.toISOString() ?? null,
      },
    });

    const completedPods = await this.membershipRepository.count({
      account: membership.account,
      paidOut: true,
    });

    await this.achievementService.handlePodCompletion({
      account: membership.account,
      membership,
      completedPods,
    });

    if (membership.pod.status === PodStatus.COMPLETED) {
      await this.activityService.recordActivity({
        pod: membership.pod,
        membership: null,
        account: membership.account,
        type: PodActivityType.POD_COMPLETED,
        metadata: {
          completedAt: membership.pod.completedAt?.toISOString() ?? null,
        },
      });

      const recipients = membership.pod.memberships
        .getItems()
        .filter((item) => !item.isSystemBot && item.account)
        .map((item) => ({
          account: item.account!,
          ...InAppNotificationMessages.podCycleCompleted(),
        }));

      await this.inAppNotificationService.createMany(recipients);
    }
  }

  private calculateTotalContributionTarget(
    membership: PodMembershipEntity,
  ): string {
    if (membership.pod.type === PodType.CUSTOM) {
      const expected =
        membership.pod.expectedMemberCount ?? membership.pod.maxMembers;
      if (!expected) {
        return '0.00';
      }
      return (membership.pod.amount * expected).toFixed(2);
    }

    const cycles = Math.ceil(membership.pod.lifecycleWeeks / 2);
    return (membership.pod.amount * cycles).toFixed(2);
  }
}
