import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { UpsertStripeBankAccountCommand } from '../upsert-stripe-bank-account.command';
import { AccountEntity } from '../../entities/account.entity';
import { UpsertStripeBankAccountResult } from '../../contracts/auth-results';
import { MailService } from '../../../../common/notification/mail.service';
import { InAppNotificationService } from '../../../notifications/in-app-notification.service';
import { InAppNotificationMessages } from '../../../notifications/in-app-notification.messages';

@Injectable()
@CommandHandler(UpsertStripeBankAccountCommand)
export class UpsertStripeBankAccountHandler
  implements
    ICommandHandler<
      UpsertStripeBankAccountCommand,
      UpsertStripeBankAccountResult
    >
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly mailService: MailService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  async execute(
    command: UpsertStripeBankAccountCommand,
  ): Promise<UpsertStripeBankAccountResult> {
    const account = await this.accountRepository.findOne({
      id: command.accountId,
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (
      account.stripeCustomerId &&
      account.stripeCustomerId !== command.customerId.trim()
    ) {
      throw new BadRequestException(
        'Provided customer identifier does not match the linked account.',
      );
    }

    const now = new Date();
    account.stripeBankAccountId = command.bankAccountId.trim();
    account.stripeBankAccountCustomerId = command.customerId.trim();
    account.stripeBankName = this.normalizeValue(command.bankName);
    account.stripeBankAccountFirstName = this.normalizeValue(
      command.accountFirstName,
    );
    account.stripeBankAccountLastName = this.normalizeValue(
      command.accountLastName,
    );
    account.stripePaymentMethodId = this.normalizeValue(
      command.paymentMethodId,
    );
    account.stripeConnectedAccountId = this.normalizeValue(
      command.connectedAccountId ?? '',
    );
    if (!account.stripeBankAccountLinkedAt) {
      account.stripeBankAccountLinkedAt = now;
    }
    account.stripeBankAccountUpdatedAt = now;
    account.stripeBankAccountLast4 = this.normalizeLast4(
      command.accountLast4,
    );

    const mismatch = this.hasNameMismatch(account);
    if (mismatch && !account.requiresFraudReview) {
      account.markFraudReview('bank_name_mismatch');
      await this.mailService.sendRequestForInformationEmail({
        email: account.email,
        firstName: account.firstName ?? account.email.split('@')[0],
      });
    }

    const em = this.accountRepository.getEntityManager();
    await em.persistAndFlush(account);

    await this.inAppNotificationService.createNotification(
      account,
      InAppNotificationMessages.bankLinked(),
    );

    return {
      id: account.stripeBankAccountId,
      customer_id: account.stripeBankAccountCustomerId,
      created_at: account.stripeBankAccountLinkedAt.toISOString(),
      updated_at: account.stripeBankAccountUpdatedAt.toISOString(),
      last4: account.stripeBankAccountLast4 ?? null,
      payment_method_id: account.stripePaymentMethodId ?? null,
      connected_account_id: account.stripeConnectedAccountId ?? null,
    };
  }

  private hasNameMismatch(account: AccountEntity): boolean {
    const accountFirst = (account.firstName ?? '').trim().toLowerCase();
    const accountLast = (account.lastName ?? '').trim().toLowerCase();
    const bankFirst =
      account.stripeBankAccountFirstName?.trim().toLowerCase() ?? '';
    const bankLast =
      account.stripeBankAccountLastName?.trim().toLowerCase() ?? '';

    if (!bankFirst && !bankLast) {
      return false;
    }

    let mismatch = false;
    if (bankFirst && accountFirst && bankFirst !== accountFirst) {
      mismatch = true;
    }

    if (bankLast && accountLast && bankLast !== accountLast) {
      mismatch = true;
    }

    return mismatch;
  }

  private normalizeValue(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizeLast4(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    return trimmed.slice(-4);
  }
}
