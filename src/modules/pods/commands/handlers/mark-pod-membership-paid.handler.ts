import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { MarkPodMembershipPaidCommand } from '../mark-pod-membership-paid.command';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';

@Injectable()
@CommandHandler(MarkPodMembershipPaidCommand)
export class MarkPodMembershipPaidHandler
  implements ICommandHandler<MarkPodMembershipPaidCommand, PodMembershipEntity>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
  ) {}

  async execute(
    command: MarkPodMembershipPaidCommand,
  ): Promise<PodMembershipEntity> {
    const membership = await this.membershipRepository.findOne(
      { id: command.membershipId },
      { populate: ['account', 'pod'] as const },
    );

    if (!membership) {
      throw new NotFoundException('Pod membership not found.');
    }

    if (membership.pod.id !== command.podId) {
      throw new NotFoundException(
        'Membership does not belong to the specified pod.',
      );
    }

    if (command.amount <= 0 || !Number.isFinite(command.amount)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    membership.paidOut = false;
    membership.payoutDate = command.paidAt ?? new Date();
    membership.payoutAmount = command.amount.toFixed(2);

    await this.membershipRepository.getEntityManager().flush();

    return membership;
  }
}
