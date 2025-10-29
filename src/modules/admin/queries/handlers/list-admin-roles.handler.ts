import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminRolesQuery } from '../list-admin-roles.query';
import { AdminRoleEntity } from '../../entities/admin-role.entity';
import type { AdminRoleSummary } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';

@QueryHandler(ListAdminRolesQuery)
export class ListAdminRolesHandler
  implements IQueryHandler<ListAdminRolesQuery, AdminRoleSummary[]>
{
  constructor(
    @InjectRepository(AdminRoleEntity)
    private readonly roleRepository: EntityRepository<AdminRoleEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(_: ListAdminRolesQuery): Promise<AdminRoleSummary[]> {
    const roles = await this.roleRepository.findAll({
      orderBy: { name: 'ASC' },
      populate: ['permissions'],
    });

    return roles.map((role) => this.accessService.mapRole(role));
  }
}
