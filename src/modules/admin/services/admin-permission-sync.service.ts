import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AdminPermissionEntity } from '../entities/admin-permission.entity';
import {
  ADMIN_PERMISSION_DEFINITIONS,
} from '../admin-permission.constants';

@Injectable()
export class AdminPermissionSyncService implements OnModuleInit {
  private readonly logger = new Logger(AdminPermissionSyncService.name);

  constructor(
    @InjectRepository(AdminPermissionEntity)
    private readonly permissionRepository: EntityRepository<AdminPermissionEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const em = this.permissionRepository.getEntityManager().fork();
    const repository = em.getRepository(AdminPermissionEntity);

    const existing = await repository.findAll();
    const byCode = new Map(existing.map((permission) => [permission.code, permission]));

    let hasChanges = false;

    for (const definition of ADMIN_PERMISSION_DEFINITIONS) {
      const current = byCode.get(definition.code);

      if (current) {
        const needsUpdate =
          (current.name ?? null) !== definition.name ||
          (current.description ?? null) !== definition.description;

        if (needsUpdate) {
          current.name = definition.name;
          current.description = definition.description;
          hasChanges = true;
        }
      } else {
        const created = repository.create(
          {
            code: definition.code,
            name: definition.name,
            description: definition.description,
          },
          { partial: true },
        );
        em.persist(created);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await em.flush();
      this.logger.log('Admin permissions synchronized.');
    }
  }
}
