import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { randomUUID } from 'crypto';
import { CreateAdminPodPlanCommand } from '../create-admin-pod-plan.command';
import { PodPlanEntity } from '../../../pods/entities/pod-plan.entity';
import type { AdminPodPlanSummary } from '../../contracts/admin-results';
import { AdminPodPlanService } from '../../services/admin-pod-plan.service';

@Injectable()
@CommandHandler(CreateAdminPodPlanCommand)
export class CreateAdminPodPlanHandler
  implements
    ICommandHandler<CreateAdminPodPlanCommand, AdminPodPlanSummary>
{
  constructor(
    @InjectRepository(PodPlanEntity)
    private readonly podPlanRepository: EntityRepository<PodPlanEntity>,
    private readonly podPlanService: AdminPodPlanService,
  ) {}

  async execute(
    command: CreateAdminPodPlanCommand,
  ): Promise<AdminPodPlanSummary> {
    if (!command.requester.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super administrators can create pod plans.',
      );
    }

    const code = command.payload.code.trim().toUpperCase();
    const existing = await this.podPlanRepository.findOne({ code });

    if (existing) {
      throw new ConflictException(
        'A pod plan already exists with the provided code.',
      );
    }

    const entity = this.podPlanRepository.create(
      {
        id: randomUUID(),
        code,
        amount: command.payload.amount,
        lifecycleWeeks: command.payload.lifecycleWeeks,
        maxMembers: command.payload.maxMembers,
        active:
          typeof command.payload.active === 'boolean'
            ? command.payload.active
            : true,
      },
      { partial: true },
    );

    await this.podPlanRepository.getEntityManager().persistAndFlush(entity);

    return this.podPlanService.buildSummary(entity);
  }
}
