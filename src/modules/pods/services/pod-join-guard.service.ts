import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../accounts/entities/account.entity';
import { PodMembershipEntity } from '../entities/pod-membership.entity';
import { MailService } from '../../../common/notification/mail.service';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class PodJoinGuardService {
  constructor(
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly mailService: MailService,
  ) {}

  ensureAccountEligible(account: AccountEntity): void {
    if (!account.stripeBankAccountId) {
      throw new BadRequestException(
        'Link a bank account to your Koajo profile before joining pods.',
      );
    }

    if (account.requiresFraudReview) {
      throw new BadRequestException(
        'Your account is currently under review. Please contact support for assistance.',
      );
    }

    if (account.missedPaymentFlag) {
      throw new BadRequestException(
        'Your account has a missed payment. Please resolve it before joining new pods.',
      );
    }
  }

  async evaluateRapidJoins(
    account: AccountEntity,
    reference: Date,
  ): Promise<boolean> {
    if (!account.id) {
      return false;
    }
    const windowStart = new Date(reference.getTime() - THREE_DAYS_MS);
    const recentCount = await this.membershipRepository.count({
      account,
      isSystemBot: false,
      joinedAt: { $gte: windowStart },
    });

    if (recentCount >= 4 && !account.requiresFraudReview) {
      account.markFraudReview('too_many_pods');
      await this.mailService.sendTooManyPodsWarningEmail({
        email: account.email,
        firstName: account.firstName ?? account.email.split('@')[0],
      });
      return true;
    }

    return false;
  }
}
