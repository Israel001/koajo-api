import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'pod_plans' })
export class PodPlanEntity {
  @PrimaryKey({ columnType: 'char(36)' })
  id!: string;

  @Property({ columnType: 'varchar(32)', unique: true })
  code!: string;

  @Property({ columnType: 'int' })
  amount!: number;

  @Property({ columnType: 'int' })
  lifecycleWeeks!: number;

  @Property({ columnType: 'int' })
  maxMembers!: number;

  @Property({ columnType: 'tinyint(1)', default: true })
  active = true;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    onUpdate: () => new Date(),
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date = new Date();
}
