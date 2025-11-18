import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { ProcessContributionNotificationsCommand } from './commands/process-contribution-notifications.command';

const PROCESS_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

@Injectable()
export class ContributionNotificationScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ContributionNotificationScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
  ) {}

  onModuleInit(): void {
    setTimeout(() => this.execute('initial').catch(() => undefined), 15_000);
    this.timer = setInterval(() => {
      void this.execute('interval');
    }, PROCESS_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async execute(trigger: 'initial' | 'interval'): Promise<void> {
    try {
      await RequestContext.create(this.orm.em, async () => {
        await this.commandBus.execute(
          new ProcessContributionNotificationsCommand(),
        );
      });
      this.logger.debug(
        `Contribution notification processing executed (${trigger}).`,
      );
    } catch (error) {
      this.logger.error(
        `Contribution notification processing failed (${trigger}): ${(error as Error).message}`,
      );
    }
  }
}
