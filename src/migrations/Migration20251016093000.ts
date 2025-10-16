import { Migration } from '@mikro-orm/migrations';

export class Migration20251016093000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `pod_memberships` add `goal_type` varchar(32) not null default 'savings', add `goal_note` varchar(255) null, add `total_contributed` decimal(15,2) not null default '0.00';",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "alter table `pod_memberships` drop `goal_type`, drop `goal_note`, drop `total_contributed`;",
    );
  }
}
