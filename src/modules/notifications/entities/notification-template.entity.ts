import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'notification_templates' })
export class NotificationTemplateEntity {
  @PrimaryKey({ columnType: 'varchar(150)' })
  code!: string;

  @Property({ columnType: 'longtext' })
  body!: string;
}
