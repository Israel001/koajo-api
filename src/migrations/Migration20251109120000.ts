import { Migration } from '@mikro-orm/migrations';

export class Migration20251109120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `stripe_payment_method_id` varchar(128) null after `stripe_bank_account_customer_id`;',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_payment_method_id`;',
    );
  }
}
