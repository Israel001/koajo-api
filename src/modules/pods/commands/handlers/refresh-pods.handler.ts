import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshPodsCommand } from '../refresh-pods.command';
import { PodDomainHelper } from '../../pod-domain.helper';

@CommandHandler(RefreshPodsCommand)
export class RefreshPodsHandler
  implements ICommandHandler<RefreshPodsCommand, void>
{
  constructor(private readonly helper: PodDomainHelper) {}

  async execute(command: RefreshPodsCommand): Promise<void> {
    const reference = command.reference ?? new Date();
    const plans = await this.helper.getActivePlans();
    for (const plan of plans) {
      await this.helper.ensurePlanLifecycle(plan, reference);
    }
    this.helper.invalidateOpenPodsCache();
  }
}
