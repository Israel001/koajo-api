import { Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { RecordIdentityVerificationCommand } from '../record-identity-verification.command';
import { AccountEntity } from '../../entities/account.entity';
import { AccountVerificationAttemptEntity } from '../../entities/account-verification-attempt.entity';
import { RecordIdentityVerificationResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(RecordIdentityVerificationCommand)
export class RecordIdentityVerificationHandler
  implements
    ICommandHandler<
      RecordIdentityVerificationCommand,
      RecordIdentityVerificationResult
    >
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
  ) {}

  async execute(
    command: RecordIdentityVerificationCommand,
  ): Promise<RecordIdentityVerificationResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const normalizedStatus = command.status.trim().toLowerCase();
    const normalizedType = command.type.trim();

    const attempt = this.verificationAttemptRepository.create(
      {
        account,
        provider: 'stripe',
        type: normalizedType,
        sessionId: command.sessionId.trim(),
        providerReference: command.identityId.trim(),
        resultId: command.resultId.trim(),
        status: normalizedStatus,
        completedAt: this.isSuccessfulStatus(normalizedStatus)
          ? new Date()
          : null,
      },
      { partial: true },
    );

    account.stripeIdentityId = command.identityId.trim();
    account.stripeIdentityResultId = command.resultId.trim();
    account.stripeVerificationCompleted = this.isSuccessfulStatus(
      normalizedStatus,
    );

    const em = this.accountRepository.getEntityManager();
    em.persist(account);
    em.persist(attempt);
    await em.flush();

    return {
      id: attempt.id,
      identity_id: account.stripeIdentityId,
      session_id: attempt.sessionId,
      result_id: account.stripeIdentityResultId,
      status: normalizedStatus,
      type: normalizedType,
      completed_at: attempt.completedAt
        ? attempt.completedAt.toISOString()
        : null,
      recorded_at: attempt.createdAt.toISOString(),
    };
  }

  private isSuccessfulStatus(status: string): boolean {
    const normalized = status.toLowerCase();
    return (
      normalized === 'verified' ||
      normalized === 'approved' ||
      normalized === 'completed' ||
      normalized === 'succeeded'
    );
  }
}
