import { Migration } from '@mikro-orm/migrations';

export class Migration20251120120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `admin_activities` (`id` char(36) not null, `admin_id` varchar(64) not null, `action` enum('flag_account', 'send_manual_email', 'deactivate_account', 'remove_bank_account', 'delete_account') not null, `metadata` json null, `created_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `admin_activities` add index `admin_activities_admin_id_index`(`admin_id`);',
    );
    this.addSql(
      'alter table `admin_activities` add index `admin_activities_action_index`(`action`);',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `admin_activities`;');
  }
}
