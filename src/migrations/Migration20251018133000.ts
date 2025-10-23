import { Migration } from '@mikro-orm/migrations';

export class Migration20251018133000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table `admin_users` (`id` char(36) not null, `email` varchar(320) not null, `password_hash` varchar(255) not null, `role` varchar(32) not null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), `last_login_at` datetime(6) null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `admin_users` add unique `admin_users_email_unique`(`email`);',
    );
  }

  override async down(): Promise<void> {
    this.addSql('drop table if exists `admin_users`;');
  }
}
