import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminPermissionsQuery } from '../list-admin-permissions.query';
import { AdminPermissionEntity } from '../../entities/admin-permission.entity';
import type { AdminPermissionSummary } from '../../contracts/admin-results';
import { ADMIN_PERMISSION_DEFINITIONS } from '../../admin-permission.constants';

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

    const allowed = new Set(
      ADMIN_PERMISSION_DEFINITIONS.map((definition) => definition.code),
    );

    const filtered = permissions.filter((permission) =>
      allowed.has(permission.code),
    );

    return filtered.map((permission) => ({
      id: permission.id,
      code: permission.code,
      name: permission.name ?? null,
      description: permission.description ?? null,
    }));
  }
}
