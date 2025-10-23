import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminUsersQuery } from '../list-admin-users.query';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { AdminUserDto } from '../../contracts/admin-results';

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler
  implements IQueryHandler<ListAdminUsersQuery, AdminUserDto[]>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
  ) {}

  async execute(_: ListAdminUsersQuery): Promise<AdminUserDto[]> {
    const admins = await this.adminRepository.findAll({
      orderBy: { createdAt: 'ASC' },
    });

    return admins.map((admin) => ({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt.toISOString(),
      lastLoginAt: admin.lastLoginAt
        ? admin.lastLoginAt.toISOString()
        : null,
    }));
  }
}
