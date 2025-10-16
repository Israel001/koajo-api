import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AchievementCode } from '../achievement-code.enum';

@Entity({ tableName: 'achievements' })
@Unique({ properties: ['code'] })
export class AchievementEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id: string = randomUUID();

  @Property({ columnType: 'varchar(64)' })
  code!: AchievementCode;

  @Property({ columnType: 'varchar(255)' })
  name!: string;

  @Property({ columnType: 'varchar(512)' })
  description!: string;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
