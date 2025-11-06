import { Migration } from '@mikro-orm/migrations';

export class Migration20251106181900 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table \`account_notifications\` (\`id\` char(36) not null, \`account_id\` char(36) not null, \`title\` varchar(255) not null, \`body\` text not null, \`severity\` varchar(32) not null, \`action_url\` varchar(512) null, \`read_at\` datetime(6) null, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`account_notifications\` add index \`account_notifications_account_id_index\`(\`account_id\`);`,
    );

    this.addSql(
      `create table \`admin_announcements\` (\`id\` char(36) not null, \`name\` varchar(160) not null, \`channel\` enum('email', 'in-app') not null default 'email', \`severity\` enum('success', 'info', 'warning', 'error', 'critical') not null default 'info', \`notification_title\` varchar(180) not null, \`message\` text not null, \`action_url\` varchar(512) null, \`image_url\` varchar(512) null, \`send_to_all\` tinyint(1) not null default false, \`created_by_id\` char(36) null, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`admin_announcements\` add index \`admin_announcements_created_by_id_index\`(\`created_by_id\`);`,
    );

    this.addSql(
      `create table \`admin_announcement_recipients\` (\`id\` char(36) not null, \`announcement_id\` char(36) not null, \`account_id\` char(36) not null, \`created_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`,
    );
    this.addSql(
      `alter table \`admin_announcement_recipients\` add index \`admin_announcement_recipients_announcement_id_index\`(\`announcement_id\`);`,
    );
    this.addSql(
      `alter table \`admin_announcement_recipients\` add index \`admin_announcement_recipients_account_id_index\`(\`account_id\`);`,
    );

    this.addSql(
      `alter table \`account_notifications\` add constraint \`account_notifications_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade on delete cascade;`,
    );

    this.addSql(
      `alter table \`admin_announcements\` add constraint \`admin_announcements_created_by_id_foreign\` foreign key (\`created_by_id\`) references \`admin_users\` (\`id\`) on update cascade on delete set null;`,
    );

    this.addSql(
      `alter table \`admin_announcement_recipients\` add constraint \`admin_announcement_recipients_announcement_id_foreign\` foreign key (\`announcement_id\`) references \`admin_announcements\` (\`id\`) on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table \`admin_announcement_recipients\` add constraint \`admin_announcement_recipients_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade on delete cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table \`admin_announcement_recipients\` drop foreign key \`admin_announcement_recipients_announcement_id_foreign\`;`,
    );

    this.addSql(`drop table if exists \`account_notifications\`;`);

    this.addSql(`drop table if exists \`admin_announcements\`;`);

    this.addSql(`drop table if exists \`admin_announcement_recipients\`;`);
  }
}
