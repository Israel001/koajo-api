import { Migration } from '@mikro-orm/migrations';

export class Migration20251107141500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_customer_ssn_last4`;',
    );
    this.addSql(
      "alter table `accounts` add `stripe_bank_account_last4` varchar(4) null;",
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_bank_account_last4`;',
    );
    this.addSql(
      "alter table `accounts` add `stripe_customer_ssn_last4` varchar(4) null;",
    );
  }
}
