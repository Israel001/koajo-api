import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { ListAdminAchievementsQuery } from '../list-admin-achievements.query';
import { AchievementEntity } from '../../../achievements/entities/achievement.entity';
import { AdminAchievementDefinition } from '../../contracts/admin-results';

@QueryHandler(ListAdminAchievementsQuery)
export class ListAdminAchievementsHandler
  implements
    IQueryHandler<ListAdminAchievementsQuery, AdminAchievementDefinition[]>
{
  constructor(
    @InjectRepository(AchievementEntity)
    private readonly achievementRepository: EntityRepository<AchievementEntity>,
  ) {}

  async execute(
    _: ListAdminAchievementsQuery,
  ): Promise<AdminAchievementDefinition[]> {
    const achievements = await this.achievementRepository.findAll({
      orderBy: { code: 'ASC' },
    });

    return achievements.map((achievement) => ({
      code: achievement.code,
      name: achievement.name,
      description: achievement.description,
    }));
  }
}
