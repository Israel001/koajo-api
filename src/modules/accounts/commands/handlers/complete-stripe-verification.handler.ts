import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../entities/account.entity';
import { EmailVerificationService } from '../../services/email-verification.service';
import { CompleteStripeVerificationCommand } from '../complete-stripe-verification.command';
import { CompleteStripeVerificationResult } from '../../contracts/auth-results';
import { AccountVerificationAttemptEntity } from '../../entities/account-verification-attempt.entity';

@Injectable()
@CommandHandler(CompleteStripeVerificationCommand)
export class CompleteStripeVerificationHandler
  implements
    ICommandHandler<
      CompleteStripeVerificationCommand,
      CompleteStripeVerificationResult
    >
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(AccountVerificationAttemptEntity)
    private readonly verificationAttemptRepository: EntityRepository<AccountVerificationAttemptEntity>,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async execute(
    command: CompleteStripeVerificationCommand,
  ): Promise<CompleteStripeVerificationResult> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    account.firstName = command.firstName.trim();
    account.lastName = command.lastName.trim();

    let verification: CompleteStripeVerificationResult['verification'] = null;

    const sessionId = command.sessionId.trim();
    const verificationType = command.verificationType.trim();
    const verificationStatus = command.verificationStatus.trim();
    const stripeReference = command.stripeReference.trim();

    const attempt = this.verificationAttemptRepository.create(
      {
        account,
        provider: 'stripe',
        type: verificationType,
        sessionId,
        providerReference: stripeReference,
        stripeReference,
        resultId: stripeReference,
        status: verificationStatus,
        completedAt: command.stripeVerificationCompleted ? new Date() : null,
      },
      { partial: true },
    );

    if (command.stripeVerificationCompleted) {
      account.markStripeVerificationCompleted();
    } else {
      account.stripeVerificationCompleted = false;
    }

    if (!account.emailVerifiedAt) {
      const issuance = await this.emailVerificationService.issue(account, {
        bypassCooldown: true,
        reason: 'stripe-verification',
        templateVariables: {
          firstname: account.firstName ?? account.email.split('@')[0],
        },
      });

      verification = {
        expiresAt: issuance.expiresAt.toISOString(),
        sentAt: issuance.sentAt.toISOString(),
      };
    }

    const em = this.accountRepository.getEntityManager();
    em.persist(account);
    em.persist(attempt);
    await em.flush();

    return {
      email: account.email,
      stripeVerificationCompleted: account.stripeVerificationCompleted,
      latestAttempt: {
        id: attempt.id,
        sessionId,
        stripeReference,
        status: verificationStatus,
        type: verificationType,
        recordedAt: attempt.createdAt.toISOString(),
        completedAt: attempt.completedAt
          ? attempt.completedAt.toISOString()
          : null,
      },
      verification,
    };
  }
}
