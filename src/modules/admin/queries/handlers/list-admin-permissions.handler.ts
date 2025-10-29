import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminPermissionsQuery } from '../list-admin-permissions.query';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import type { AdminPermissionSummary } from '../../contracts/admin-results';

@QueryHandler(ListAdminPermissionsQuery)
export class ListAdminPermissionsHandler
  implements
    IQueryHandler<ListAdminPermissionsQuery, AdminPermissionSummary[]>
{
  constructor(
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
  ) {}

  async execute(
    _: ListAdminPermissionsQuery,
  ): Promise<AdminPermissionSummary[]> {
    const permissions = await this.permissionRepository.findAll({
      orderBy: { code: 'ASC' },
    });

    return permissions.map((permission) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name ?? null,
      description: permission.description ?? null,
    }));
  }
}
