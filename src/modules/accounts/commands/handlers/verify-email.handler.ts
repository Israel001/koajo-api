import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  accountChecksumFields,
  ACCOUNT_CHECKSUM_CONTEXT,
} from '../../domain/account.integrity';
import { AccountEntity } from '../../entities/account.entity';
import { EmailVerificationService } from '../../services/email-verification.service';
import { VerifyEmailCommand } from '../verify-email.command';
import { MailService } from '../../../../common/notification/mail.service';

@Injectable()
@CommandHandler(VerifyEmailCommand)
export class VerifyEmailHandler
  implements ICommandHandler<VerifyEmailCommand, void>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly checksumService: ChecksumService,
    private readonly mailService: MailService,
  ) {}

  async execute(command: VerifyEmailCommand): Promise<void> {
    const email = command.email.trim().toLowerCase();
    const account = await this.accountRepository.findOne({ email });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (account.emailVerifiedAt) {
      throw new BadRequestException('Email is already verified.');
    }

    await this.emailVerificationService.verify(account, command.token.trim());

    account.markEmailVerified(new Date());
    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    await this.accountRepository.getEntityManager().flush();

    const firstname = account.firstName ?? account.email.split('@')[0];
    await this.mailService.sendWelcomeEmail(account.email, firstname);
  }
}
