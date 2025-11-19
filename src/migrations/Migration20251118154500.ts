import { Migration } from '@mikro-orm/migrations';

export class Migration20251118154500 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `bank_routing_number_encrypted` varchar(512) null, add `bank_account_number_encrypted` varchar(512) null;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `bank_routing_number_encrypted`, drop column `bank_account_number_encrypted`;'
    );
  }
}
