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

@CommandHandler(CompleteMembershipCommand)
export class CompleteMembershipHandler
  implements ICommandHandler<CompleteMembershipCommand, void>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly achievementService: AchievementService,
    private readonly checksumService: ChecksumService,
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
    await membership.pod.memberships.init();

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

    const completedPods = await this.membershipRepository.count({
      account: membership.account,
      paidOut: true,
    });

    await this.achievementService.handlePodCompletion({
      account: membership.account,
      completedPods,
    });
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
