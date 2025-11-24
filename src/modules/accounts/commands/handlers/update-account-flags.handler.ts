import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpdateAccountFlagsCommand } from '../update-account-flags.command';
import { AccountEntity } from '../../entities/account.entity';
import { MailService } from '../../../../common/notification/mail.service';
import { PodMembershipEntity } from '../../../pods/entities/pod-membership.entity';

@Injectable()
@CommandHandler(UpdateAccountFlagsCommand)
export class UpdateAccountFlagsHandler
  implements ICommandHandler<UpdateAccountFlagsCommand, AccountEntity>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    @InjectRepository(PodMembershipEntity)
    private readonly membershipRepository: EntityRepository<PodMembershipEntity>,
    private readonly mailService: MailService,
  ) {}

  async execute(
    command: UpdateAccountFlagsCommand,
  ): Promise<AccountEntity> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (
      typeof command.fraudReview === 'undefined' &&
      typeof command.missedPayment === 'undefined' &&
      typeof command.overheat === 'undefined'
    ) {
      throw new BadRequestException(
        'No flag updates were supplied. Provide fraudReview, missedPayment, and/or overheat.',
      );
    }

    let fraudFlagRaised = false;

    if (typeof command.fraudReview !== 'undefined') {
      if (command.fraudReview) {
        account.markFraudReview(account.fraudReviewReason ?? 'manual_update');
        fraudFlagRaised = true;
      } else {
        account.clearFraudReview();
      }
    }

    const wasMissedPayment = account.missedPaymentFlag;

    if (typeof command.missedPayment !== 'undefined') {
      if (command.missedPayment) {
        account.flagMissedPayment(
          account.missedPaymentReason ?? 'manual_update',
        );
      } else {
        account.clearMissedPayment();
      }
    }

    if (typeof command.overheat !== 'undefined') {
      if (command.overheat) {
        account.markOverheat(account.overheatReason ?? 'manual_update');
      } else {
        account.clearOverheat();
      }
    }

    await this.accountRepository.getEntityManager().flush();

    if (fraudFlagRaised) {
      await this.mailService.sendRequestForInformationEmail({
        email: account.email,
        firstName: account.firstName ?? account.email.split('@')[0],
      });
    }

    if (command.missedPayment === true && !wasMissedPayment) {
      const latestMembership = await this.membershipRepository.findOne(
        { account },
        { populate: ['pod'] as const, orderBy: { joinedAt: 'DESC' } },
      );
      const amount =
        latestMembership?.pod?.amount !== undefined
          ? latestMembership.pod.amount
          : 0;
      await this.mailService.sendMissedContributionEmail({
        email: account.email,
        amount,
        firstName: account.firstName ?? null,
        reason: account.missedPaymentReason ?? 'manual_update',
      });
    }

    return account;
  }
}
