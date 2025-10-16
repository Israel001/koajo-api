import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { ProcessAccountInactivityCommand } from './commands/process-account-inactivity.command';

const PROCESS_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

@Injectable()
export class AccountInactivityScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AccountInactivityScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
  ) {}

  onModuleInit() {
    setTimeout(() => this.execute('initial').catch(() => undefined), 5_000);

    this.timer = setInterval(() => {
      void this.execute('interval');
    }, PROCESS_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async execute(trigger: 'initial' | 'interval'): Promise<void> {
    try {
      await RequestContext.create(this.orm.em, async () => {
        await this.commandBus.execute(new ProcessAccountInactivityCommand());
      });
      this.logger.debug(`Account inactivity processing executed (${trigger}).`);
    } catch (error) {
      this.logger.error(
        `Account inactivity processing failed (${trigger}): ${(error as Error).message}`,
      );
    }
  }
}
