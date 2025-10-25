import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAdminPodPlanCommand } from '../update-admin-pod-plan.command';
import { PodPlanEntity } from '../../../pods/entities/pod-plan.entity';
import type { AdminPodPlanSummary } from '../../contracts/admin-results';
import { AdminPodPlanService } from '../../services/admin-pod-plan.service';

@Injectable()
@CommandHandler(UpdateAdminPodPlanCommand)
export class UpdateAdminPodPlanHandler
  implements
    ICommandHandler<UpdateAdminPodPlanCommand, AdminPodPlanSummary>
{
  constructor(
    @InjectRepository(PodPlanEntity)
    private readonly podPlanRepository: EntityRepository<PodPlanEntity>,
    private readonly podPlanService: AdminPodPlanService,
  ) {}

  async execute(
    command: UpdateAdminPodPlanCommand,
  ): Promise<AdminPodPlanSummary> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can update pod plans.',
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
        'This pod plan cannot be modified because it is used by pods with real members.',
      );
    }

    if (command.payload.code) {
      const code = command.payload.code.trim().toUpperCase();
      if (code !== plan.code) {
        throw new BadRequestException('Pod plan code cannot be changed.');
      }
    }

    if (typeof command.payload.amount === 'number') {
      plan.amount = command.payload.amount;
    }

    if (typeof command.payload.lifecycleWeeks === 'number') {
      plan.lifecycleWeeks = command.payload.lifecycleWeeks;
    }

    if (typeof command.payload.maxMembers === 'number') {
      plan.maxMembers = command.payload.maxMembers;
    }

    if (typeof command.payload.active === 'boolean') {
      plan.active = command.payload.active;
    }

    await this.podPlanRepository.getEntityManager().flush();

    return this.podPlanService.buildSummary(plan);
  }
}
