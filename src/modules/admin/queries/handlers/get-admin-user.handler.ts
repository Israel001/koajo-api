import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { GetAdminUserQuery } from '../get-admin-user.query';
import { AdminUserEntity } from '../../entities/admin-user.entity';
import type { AdminUserDto } from '../../contracts/admin-results';
import { AdminAccessService } from '../../services/admin-access.service';
import { NotFoundException } from '@nestjs/common';

@QueryHandler(GetAdminUserQuery)
export class GetAdminUserHandler
  implements IQueryHandler<GetAdminUserQuery, AdminUserDto>
{
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminRepository: EntityRepository<AdminUserEntity>,
    private readonly accessService: AdminAccessService,
  ) {}

  async execute(query: GetAdminUserQuery): Promise<AdminUserDto> {
    const admin = await this.adminRepository.findOne(query.adminId, {
      populate: [
        'roles.permissions',
        'directPermissions',
        'permissionOverrides.permission',
      ],
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found.');
    }

    return this.accessService.mapAdminUser(admin);
  }
}
