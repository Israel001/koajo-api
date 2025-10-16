import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ProcessAccountInactivityCommand } from '../process-account-inactivity.command';
import { AccountEntity } from '../../entities/account.entity';
import { MailService } from '../../../../common/notification/mail.service';
import { ChecksumService } from '../../../../common/security/checksum.service';
import {
  ACCOUNT_CHECKSUM_CONTEXT,
  accountChecksumFields,
} from '../../domain/account.integrity';

const DAY_MS = 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * DAY_MS;
const NINETY_DAYS_MS = 90 * DAY_MS;

@CommandHandler(ProcessAccountInactivityCommand)
export class ProcessAccountInactivityHandler
  implements ICommandHandler<ProcessAccountInactivityCommand, void>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
    private readonly mailService: MailService,
    private readonly checksumService: ChecksumService,
  ) {}

  async execute(command: ProcessAccountInactivityCommand): Promise<void> {
    const reference = command.reference ?? new Date();
    const sixtyThreshold = new Date(reference.getTime() - SIXTY_DAYS_MS);

    const candidates = await this.accountRepository.find(
      {
        $or: [
          { lastPodJoinedAt: { $lte: sixtyThreshold } },
          { lastPodJoinedAt: null, createdAt: { $lte: sixtyThreshold } },
        ],
      },
      { populate: [] },
    );

    if (!candidates.length) {
      return;
    }

    const em = this.accountRepository.getEntityManager();

    for (const account of candidates) {
      const lastActivity = account.lastPodJoinedAt ?? account.createdAt;
      const inactivityDuration = reference.getTime() - lastActivity.getTime();

      if (inactivityDuration >= NINETY_DAYS_MS) {
        await this.processNinetyDayInactivity(account, reference, em);
        continue;
      }

      if (inactivityDuration >= SIXTY_DAYS_MS) {
        await this.processSixtyDayInactivity(account, reference, em);
      }
    }

    await em.flush();
  }

  private async processSixtyDayInactivity(
    account: AccountEntity,
    reference: Date,
    em: ReturnType<EntityRepository<AccountEntity>['getEntityManager']>,
  ): Promise<void> {
    const lastActivity = account.lastPodJoinedAt ?? account.createdAt;
    if (
      account.inactivityWarningSentAt &&
      account.inactivityWarningSentAt.getTime() >= lastActivity.getTime()
    ) {
      return;
    }

    await this.mailService.sendAccountInactivityReminder(account.email);
    account.inactivityWarningSentAt = reference;
    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );
    em.persist(account);
  }

  private async processNinetyDayInactivity(
    account: AccountEntity,
    reference: Date,
    em: ReturnType<EntityRepository<AccountEntity>['getEntityManager']>,
  ): Promise<void> {
    const lastActivity = account.lastPodJoinedAt ?? account.createdAt;
    if (
      account.inactivityClosureSentAt &&
      account.inactivityClosureSentAt.getTime() >= lastActivity.getTime()
    ) {
      return;
    }

    await this.mailService.sendAccountClosureNotice(account.email, reference);
    account.inactivityClosureSentAt = reference;
    if (account.isActive) {
      account.deactivate(reference);
    }
    account.checksum = this.checksumService.generate(
      ACCOUNT_CHECKSUM_CONTEXT,
      ...accountChecksumFields(account),
    );
    em.persist(account);
  }
}
