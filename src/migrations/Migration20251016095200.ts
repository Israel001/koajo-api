import { Migration } from '@mikro-orm/migrations';

export class Migration20251016095200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `accounts` add `last_pod_joined_at` datetime(6) null, add `is_active` tinyint(1) not null default 1, add `deactivated_at` datetime(6) null;",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      "alter table `accounts` drop `last_pod_joined_at`, drop `is_active`, drop `deactivated_at`;",
    );
  }
}
