import { Injectable, NestMiddleware } from '@nestjs/common';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class MikroOrmRequestContextMiddleware implements NestMiddleware {
  constructor(private readonly orm: MikroORM) {}

  async use(_req: Request, res: Response, next: NextFunction): Promise<void> {
    const fork = this.orm.em.fork({
      useContext: true,
      clear: true,
    });

    await new Promise<void>((resolve, reject) => {
      RequestContext.create(fork, () => {
        const cleanup = () => {
          res.removeListener('error', cancel);
          res.removeListener('close', cancel);
          fork.clear();
          resolve();
        };

        const cancel = (error?: Error) => {
          res.removeListener('finish', cleanup);
          res.removeListener('close', cancel);
          res.removeListener('error', cancel);
          fork.clear();
          reject(error ?? new Error('Request aborted'));
        };

        res.once('finish', cleanup);
        res.once('close', cancel);
        res.once('error', cancel);

        try {
          next();
        } catch (error) {
          cancel(error as Error);
        }
      });
    });
  }
}
