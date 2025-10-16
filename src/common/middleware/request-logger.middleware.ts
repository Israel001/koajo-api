import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const startedAt = Date.now();

    const log = () => {
      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `${method} ${originalUrl} ${res.statusCode} - ${elapsedMs}ms`,
      );
    };

    const warnOnClose = () => {
      if (!res.writableFinished) {
        const elapsedMs = Date.now() - startedAt;
        this.logger.warn(
          `${method} ${originalUrl} connection closed before completing after ${elapsedMs}ms`,
        );
      }
    };

    res.once('finish', log);
    res.once('close', warnOnClose);

    next();
  }
}
