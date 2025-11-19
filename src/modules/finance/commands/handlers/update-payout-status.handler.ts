import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdatePayoutStatusCommand } from '../update-payout-status.command';
import { PayoutEntity } from '../../entities/payout.entity';
import { TransactionEntity } from '../../entities/transaction.entity';

@Injectable()
@CommandHandler(UpdatePayoutStatusCommand)
export class UpdatePayoutStatusHandler
  implements ICommandHandler<UpdatePayoutStatusCommand>
{
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly payoutRepository: EntityRepository<PayoutEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: EntityRepository<TransactionEntity>,
  ) {}

  async execute(command: UpdatePayoutStatusCommand): Promise<{
    payoutId: string;
    status: string;
  }> {
    const payout = await this.payoutRepository.findOne(
      { id: command.payoutId },
      { populate: ['membership', 'pod'] as const },
    );

    if (!payout || payout.pod.id !== command.podId) {
      throw new NotFoundException('Payout not found for the specified pod.');
    }

    const membership = payout.membership ?? null;

    const nextStatus = this.resolveStatus(command);
    payout.status = nextStatus;

    const transaction = await this.transactionRepository.findOne({ payout });
    if (transaction) {
      transaction.status = nextStatus;
    }

    if (membership) {
      if (command.status === 'success') {
        membership.paidOut = true;
        membership.payoutDate = membership.payoutDate ?? new Date();
      } else if (command.status === 'failed') {
        membership.paidOut = false;
      }
    }

    await this.payoutRepository.getEntityManager().flush();

    return {
      payoutId: payout.id,
      status: payout.status,
    };
  }

  private resolveStatus(command: UpdatePayoutStatusCommand): string {
    switch (command.status) {
      case 'success':
        return 'succeeded';
      case 'failed':
        return 'failed';
      case 'other':
        if (!command.customStatus || !command.customStatus.trim()) {
          throw new BadRequestException(
            'customStatus is required when status is set to other.',
          );
        }
        return command.customStatus.trim();
      default:
        return command.status;
    }
  }
}
