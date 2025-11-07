import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import Stripe from 'stripe';
import { AccountVerificationAttemptEntity } from '../../../accounts/entities/account-verification-attempt.entity';
import { ListAccountVerificationAttemptsQuery } from '../list-account-verification-attempts.query';
import {
  AdminAccountVerificationAttempt,
  AdminAccountVerificationsListResult,
} from '../../contracts/admin-results';
import { StripeIdentityService } from '../../services/stripe-identity.service';

@QueryHandler(ListAccountVerificationAttemptsQuery)
export class ListAccountVerificationAttemptsHandler
  implements
    IQueryHandler<
      ListAccountVerificationAttemptsQuery,
      AdminAccountVerificationsListResult
    >
{
  constructor(
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly attemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
    private readonly stripeIdentityService: StripeIdentityService,
  ) {}

  async execute(
    query: ListAccountVerificationAttemptsQuery,
  ): Promise<AdminAccountVerificationsListResult> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);

    const [attempts, total] = await this.attemptRepository.findAndCount(
      {},
      {
        populate: ['account'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset,
      },
    );

    const stripePayloads = await this.loadStripeSessions(attempts);

    const items: AdminAccountVerificationAttempt[] = attempts.map(
      (attempt, index) => ({
        id: attempt.id,
        accountId: attempt.account?.id ?? null,
        accountEmail: attempt.account?.email ?? null,
        provider: attempt.provider,
        type: attempt.type,
        status: attempt.status,
        sessionId: attempt.sessionId,
        providerReference: attempt.providerReference ?? null,
        stripeReference: attempt.stripeReference ?? null,
        resultId: attempt.resultId ?? null,
        recordedAt: attempt.createdAt.toISOString(),
        completedAt: attempt.completedAt?.toISOString() ?? null,
        stripeSession: stripePayloads[index].data,
        stripeError: stripePayloads[index].error,
        stripeSessionRetrievedAt: stripePayloads[index].retrievedAt,
      }),
    );

    return {
      total,
      items,
    };
  }

  private async loadStripeSessions(
    attempts: AccountVerificationAttemptEntity[],
  ): Promise<
    Array<{
      data: Record<string, unknown> | null;
      error: string | null;
      retrievedAt: string | null;
    }>
  > {
    const updates: AccountVerificationAttemptEntity[] = [];

    const results = await Promise.all(
      attempts.map(async (attempt) => {
        if (attempt.stripeSessionPayload) {
          return {
            data: attempt.stripeSessionPayload,
            error: null,
            retrievedAt: attempt.stripeSessionRetrievedAt
              ? attempt.stripeSessionRetrievedAt.toISOString()
              : null,
          };
        }

        try {
          const session =
            await this.stripeIdentityService.retrieveVerificationSession(
              attempt.sessionId,
            );

          if (session) {
            const snapshot = this.serializeSession(session);
            attempt.stripeSessionPayload = snapshot;
            attempt.stripeSessionRetrievedAt = new Date();
            updates.push(attempt);

            return {
              data: snapshot,
              error: null,
              retrievedAt: attempt.stripeSessionRetrievedAt.toISOString(),
            };
          }

          return { data: null, error: null, retrievedAt: null };
        } catch (error) {
          return { data: null, error: (error as Error).message, retrievedAt: null };
        }
      }),
    );

    if (updates.length) {
      await this.attemptRepository.getEntityManager().flush();
    }

    return results;
  }

  private serializeSession(
    session: Stripe.Identity.VerificationSession,
  ): Record<string, unknown> {
    return JSON.parse(JSON.stringify(session));
  }
}
