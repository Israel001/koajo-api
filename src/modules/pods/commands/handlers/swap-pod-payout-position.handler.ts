import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { SwapPodPayoutPositionCommand } from '../swap-pod-payout-position.command';
import { PodMembershipEntity } from '../../entities/pod-membership.entity';
import { PodType } from '../../pod-type.enum';
import { computeCustomPodChecksum } from '../../custom-pod-integrity.util';
import { ChecksumService } from '../../../../common/security/checksum.service';

@CommandHandler(SwapPodPayoutPositionCommand)
export class SwapPodPayoutPositionHandler
  implements ICommandHandler<SwapPodPayoutPositionCommand>
{
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(command: SwapPodPayoutPositionCommand): Promise<{
    podId: string;
    swaps: Array<{
      membershipId: string;
      finalOrder: number | null;
      payoutDate: string | null;
    }>;
  }> {
    if (command.firstMembershipId === command.secondMembershipId) {
      throw new BadRequestException('Membership identifiers must be different.');
    }

    const memberships = await this.membershipRepository.find(
      {
        id: { $in: [command.firstMembershipId, command.secondMembershipId] },
        pod: command.podId,
      },
      { populate: ['pod'] as const },
    );

    if (memberships.length !== 2) {
      throw new NotFoundException('One or both memberships were not found for this pod.');
    }

    const [first, second] = memberships;
    const pod = first.pod;

    if (!pod || pod.type !== PodType.CUSTOM) {
      throw new BadRequestException('Payout positions can only be swapped for custom pods.');
    }

    // Ensure both memberships belong to the same pod
    if (second.pod?.id !== pod.id) {
      throw new BadRequestException('Memberships must belong to the same pod.');
    }

    if (first.finalOrder === null || second.finalOrder === null) {
      throw new BadRequestException('Both memberships must have assigned payout orders.');
    }

    const firstOrder = first.finalOrder;
    const secondOrder = second.finalOrder;
    const firstPayoutDate = first.payoutDate;
    const secondPayoutDate = second.payoutDate;

    first.finalOrder = secondOrder;
    first.payoutDate = secondPayoutDate;
    second.finalOrder = firstOrder;
    second.payoutDate = firstPayoutDate;

    pod.checksum = computeCustomPodChecksum(this.checksumService, pod);
    await this.membershipRepository.getEntityManager().flush();

    return {
      podId: pod.id,
      swaps: [
        {
          membershipId: first.id,
          finalOrder: first.finalOrder ?? null,
          payoutDate: first.payoutDate ? first.payoutDate.toISOString() : null,
        },
        {
          membershipId: second.id,
          finalOrder: second.finalOrder ?? null,
          payoutDate: second.payoutDate ? second.payoutDate.toISOString() : null,
        },
      ],
    };
  }
}
