import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { CommandBus } from '@nestjs/cqrs';
import { RefreshPodsCommand } from './commands/refresh-pods.command';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class PodsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PodsScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly orm: MikroORM,
  ) {}

  onModuleInit() {
    // Kick off an initial refresh shortly after boot.
    setTimeout(() => this.execute('initial').catch(() => undefined), 10_000);

    this.timer = setInterval(() => {
      void this.execute('interval');
    }, REFRESH_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async execute(trigger: 'initial' | 'interval'): Promise<void> {
    try {
      await RequestContext.create(this.orm.em, async () => {
        await this.commandBus.execute(new RefreshPodsCommand());
      });
      this.logger.debug(`Pod lifecycle refresh executed (${trigger}).`);
    } catch (error) {
      this.logger.error(
        `Pod lifecycle refresh failed (${trigger}): ${(error as Error).message}`,
      );
    }
  }
}
