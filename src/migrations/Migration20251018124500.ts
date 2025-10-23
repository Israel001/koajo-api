import { Migration } from '@mikro-orm/migrations';

export class Migration20251018124500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `avatar_url` varchar(512) null;',
    );
    this.addSql(
      'alter table `accounts` add `email_notifications_enabled` tinyint(1) not null default true;',
    );
    this.addSql(
      'alter table `accounts` add `transaction_notifications_enabled` tinyint(1) not null default true;',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop `avatar_url`;',
    );
    this.addSql(
      'alter table `accounts` drop `email_notifications_enabled`;',
    );
    this.addSql(
      'alter table `accounts` drop `transaction_notifications_enabled`;',
    );
  }
}
