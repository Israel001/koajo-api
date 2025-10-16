import { ConflictException, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import * as argon2 from 'argon2';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  accountChecksumFields,
  ACCOUNT_CHECKSUM_CONTEXT,
} from '../../domain/account.integrity';
import { AccountEntity } from '../../entities/account.entity';
import { RegisterAccountCommand } from '../register-account.command';
import { SignupResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(RegisterAccountCommand)
export class RegisterAccountHandler
  implements ICommandHandler<RegisterAccountCommand, SignupResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(command: RegisterAccountCommand): Promise<SignupResult> {
    const email = command.email.trim().toLowerCase();
    const phone = command.phoneNumber.trim();

    const existingEmail = await this.accountRepository.findOne({ email });
    if (existingEmail) {
      throw new ConflictException('An account already exists with that email.');
    }

    const existingPhone = await this.accountRepository.findOne({
      phoneNumber: phone,
    });

    if (existingPhone) {
      throw new ConflictException(
        'An account already exists with that phone number.',
      );
    }

    const passwordHash = await argon2.hash(command.password, {
      type: argon2.argon2id,
    });

    const account = this.accountRepository.create(
      {
        email,
        phoneNumber: phone,
        passwordHash,
      },
      { partial: true },
    );

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    await this.accountRepository.getEntityManager().persistAndFlush(account);

    return {
      accountId: account.id,
      email: account.email,
      phoneNumber: account.phoneNumber,
      emailVerified: Boolean(account.emailVerifiedAt),
      verification: null,
    };
  }
}
