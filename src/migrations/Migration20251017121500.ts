import { Migration } from '@mikro-orm/migrations';

export class Migration20251017121500 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table `accounts` add `inactivity_warning_sent_at` datetime(6) null;');
    this.addSql('alter table `accounts` add `inactivity_closure_sent_at` datetime(6) null;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table `accounts` drop `inactivity_closure_sent_at`;');
    this.addSql('alter table `accounts` drop `inactivity_warning_sent_at`;');
  }
}
