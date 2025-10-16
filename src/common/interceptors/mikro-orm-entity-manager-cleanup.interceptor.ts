import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class MikroOrmEntityManagerCleanupInterceptor
  implements NestInterceptor
{
  constructor(private readonly entityManager: EntityManager) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(finalize(() => this.entityManager.clear()));
  }
}
