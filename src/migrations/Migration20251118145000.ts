import { Migration } from '@mikro-orm/migrations';

export class Migration20251118145000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `stripe_connected_account_id` varchar(128) null;',
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_connected_account_id`;',
    );
  }
}
