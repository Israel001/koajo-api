import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'avatars' })
export class AvatarEntity {
  @PrimaryKey({ columnType: 'varchar(64)' })
  id!: string;

  @Property({ columnType: 'varchar(255)' })
  altText!: string;

  @Property({ columnType: 'tinyint(1)', default: false })
  isDefault = false;

  @Property({ columnType: 'varchar(16)' })
  gender!: string;

  @Property({ columnType: 'datetime(6)', defaultRaw: 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date = new Date();

  @Property({
    columnType: 'datetime(6)',
    defaultRaw: 'CURRENT_TIMESTAMP(6)',
    onUpdate: () => new Date(),
  })
  updatedAt: Date = new Date();
}
