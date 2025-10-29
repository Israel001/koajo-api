import { Migration } from '@mikro-orm/migrations';

export class Migration20251025182000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "alter table `accounts` add `stripe_bank_account_linked_at` datetime(6) null, add `stripe_bank_account_updated_at` datetime(6) null;",
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop `stripe_bank_account_linked_at`, drop `stripe_bank_account_updated_at`;',
    );
  }
}
