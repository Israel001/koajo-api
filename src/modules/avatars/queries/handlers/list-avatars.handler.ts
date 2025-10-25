import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { AvatarEntity } from '../../entities/avatar.entity';
import { ListAvatarsQuery } from '../list-avatars.query';
import type { AvatarSummary } from '../../contracts/avatar-result';

@QueryHandler(ListAvatarsQuery)
export class ListAvatarsHandler
  implements IQueryHandler<ListAvatarsQuery, AvatarSummary[]>
{
  constructor(
    @InjectRepository(AvatarEntity)
    private readonly avatarRepository: EntityRepository<AvatarEntity>,
  ) {}

  async execute(query: ListAvatarsQuery): Promise<AvatarSummary[]> {
    const where =
      query.gender && query.gender.trim().length > 0
        ? { gender: query.gender.trim().toLowerCase() }
        : {};

    const avatars = await this.avatarRepository.find(where, {
      orderBy: { isDefault: 'DESC', createdAt: 'ASC', id: 'ASC' },
    });

    return avatars.map((avatar) => ({
      id: avatar.id,
      altText: avatar.altText,
      isDefault: avatar.isDefault,
      gender: avatar.gender,
      createdAt: avatar.createdAt.toISOString(),
      updatedAt: avatar.updatedAt.toISOString(),
    }));
  }
}
