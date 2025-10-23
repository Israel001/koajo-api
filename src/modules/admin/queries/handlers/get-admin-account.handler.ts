import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { NotFoundException } from '@nestjs/common';
import { GetAdminAccountQuery } from '../get-admin-account.query';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { AdminAccountDetail } from '../../contracts/admin-results';
import { toAdminAccountDetail } from './list-admin-accounts.handler';

@QueryHandler(GetAdminAccountQuery)
export class GetAdminAccountHandler
  implements IQueryHandler<GetAdminAccountQuery, AdminAccountDetail>
{
  constructor(
    @InjectRepository(AccountEntity)
    accountRepository: EntityRepository<AccountEntity>,
  ) {
    this.accountRepository = accountRepository;
  }

  private readonly accountRepository: EntityRepository<AccountEntity>;

  async execute(query: GetAdminAccountQuery): Promise<AdminAccountDetail> {
    const account = await this.accountRepository.findOne({ id: query.accountId });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    return toAdminAccountDetail(account);
  }
}
