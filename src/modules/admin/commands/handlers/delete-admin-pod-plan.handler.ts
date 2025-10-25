import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { DeleteAdminPodPlanCommand } from '../delete-admin-pod-plan.command';
import { PodPlanEntity } from '../../../pods/entities/pod-plan.entity';
import { AdminPodPlanService } from '../../services/admin-pod-plan.service';

@Injectable()
@CommandHandler(DeleteAdminPodPlanCommand)
export class DeleteAdminPodPlanHandler
  implements ICommandHandler<DeleteAdminPodPlanCommand, void>
{
  constructor(
    @InjectRepository(PodPlanEntity)
    private readonly podPlanRepository: EntityRepository<PodPlanEntity>,
    private readonly podPlanService: AdminPodPlanService,
  ) {}

  async execute(command: DeleteAdminPodPlanCommand): Promise<void> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can delete pod plans.',
      );
    }

    const plan = await this.podPlanRepository.findOne({
      id: command.planId,
    });

    if (!plan) {
      throw new NotFoundException('Pod plan not found.');
    }

    const hasRealMembers = await this.podPlanService.hasPodsWithRealMembers(
      plan.code,
    );

    if (hasRealMembers) {
      throw new ConflictException(
        'This pod plan cannot be deleted because it is used by pods with real members.',
      );
    }

    await this.podPlanRepository.getEntityManager().removeAndFlush(plan);
  }
}
