import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AccountEntity } from '../../../accounts/entities/account.entity';
import { ListAllAdminAccountsQuery } from '../list-all-admin-accounts.query';
import type { AdminAccountDetail } from '../../contracts/admin-results';
import { toAdminAccountDetail } from './list-admin-accounts.handler';

@QueryHandler(ListAllAdminAccountsQuery)
export class ListAllAdminAccountsHandler
  implements IQueryHandler<ListAllAdminAccountsQuery, AdminAccountDetail[]>
{
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: EntityRepository<AccountEntity>,
  ) {}

  async execute(_: ListAllAdminAccountsQuery): Promise<AdminAccountDetail[]> {
    const accounts = await this.accountRepository.findAll({
      orderBy: { createdAt: 'DESC' },
    });

    return accounts.map((account) => toAdminAccountDetail(account));
  }
}
