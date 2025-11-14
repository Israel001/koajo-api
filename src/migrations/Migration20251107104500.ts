import { Migration } from '@mikro-orm/migrations';

export class Migration20251107104500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table `email_logs` (`id` char(36) not null, `to` varchar(320) not null, `from` varchar(320) null, `subject` varchar(255) not null, `template` varchar(64) null, `category` enum('system', 'transaction') not null default 'system', `reason` varchar(255) null, `status` enum('pending', 'sent', 'failed') not null default 'pending', `message_id` varchar(255) null, `error_message` text null, `metadata` json null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), `sent_at` datetime(6) null, `failed_at` datetime(6) null, primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `email_logs` add index `email_logs_to_index`(`to`);',
    );
    this.addSql(
      'alter table `email_logs` add index `email_logs_status_index`(`status`);',
    );

    this.addSql(
      "alter table `accounts` add `overheat_flag` tinyint(1) not null default false, add `overheat_reason` varchar(128) null;",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `overheat_flag`, drop column `overheat_reason`;',
    );
    this.addSql('drop table if exists `email_logs`;');
  }
}
