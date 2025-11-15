import { Migration } from '@mikro-orm/migrations';

export class Migration20251108120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `account_notifications` add `context` varchar(150) null;",
    );
    this.addSql(
      'alter table `account_notifications` add unique `account_notification_context_unique`(`account_id`, `context`);',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `account_notifications` drop index `account_notification_context_unique`;',
    );
    this.addSql(
      'alter table `account_notifications` drop column `context`;',
    );
  }
}
