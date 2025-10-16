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
    account.updateStripeVerificationMetadata({
      attemptCount: command.verificationAttemptCount ?? undefined,
      firstAttemptAt: command.verificationFirstAttemptDate ?? null,
      lastAttemptAt: command.verificationLastAttemptDate ?? null,
      status: command.verificationStatus ?? null,
    });

    let verification: CompleteStripeVerificationResult['verification'] = null;

    if (command.stripeVerificationCompleted) {
      if (!account.stripeVerificationCompleted) {
        account.markStripeVerificationCompleted();
      }
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

    await this.accountRepository.getEntityManager().flush();

    return {
      email: account.email,
      stripeVerificationCompleted: account.stripeVerificationCompleted,
      verificationAttemptCount: account.stripeVerificationAttemptCount,
      verificationFirstAttemptDate:
        account.stripeVerificationFirstAttemptAt?.toISOString() ?? null,
      verificationLastAttemptDate:
        account.stripeVerificationLastAttemptAt?.toISOString() ?? null,
      verificationStatus: account.stripeVerificationStatus ?? null,
      verification,
    };
  }
}
