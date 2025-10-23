import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../entities/account.entity';
import { UpdateAvatarCommand } from '../update-avatar.command';
import { accountChecksumFields, ACCOUNT_CHECKSUM_CONTEXT } from '../../domain/account.integrity';
import { ChecksumService } from '../../../../common/security/checksum.service';
import type { UpdateAvatarResult } from '../../contracts/auth-results';

@Injectable()
@CommandHandler(UpdateAvatarCommand)
export class UpdateAvatarHandler
  implements ICommandHandler<UpdateAvatarCommand, UpdateAvatarResult>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(command: UpdateAvatarCommand): Promise<UpdateAvatarResult> {
    const account = await this.accountRepository.findOne({ id: command.accountId });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (command.avatarUrl === undefined) {
      throw new BadRequestException('Avatar URL is required.');
    }

    const trimmed = command.avatarUrl === null ? null : command.avatarUrl.trim();

    if (trimmed !== null && trimmed.length === 0) {
      throw new BadRequestException('Avatar URL cannot be empty.');
    }

    account.avatarUrl = trimmed;

    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );

    await this.accountRepository.getEntityManager().persistAndFlush(account);

    return {
      avatarUrl: account.avatarUrl ?? null,
    };
  }
}
