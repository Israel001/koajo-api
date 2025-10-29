import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminUsersQuery } from '../list-admin-users.query';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import { AdminUserDto } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler
  implements IQueryHandler<ListAdminUsersQuery, AdminUserDto[]>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(_: ListAdminUsersQuery): Promise<AdminUserDto[]> {
    const admins = await this.adminRepository.findAll({
      orderBy: { createdAt: 'ASC' },
      populate: ['roles.permissions', 'directPermissions', 'permissionOverrides.permission'],
    });

    return admins.map((admin) => this.accessService.mapAdminUser(admin));
  }
}
