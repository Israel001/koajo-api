import { Migration } from '@mikro-orm/migrations';

export class Migration20251124163000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `stripe_recipient_id` varchar(128) null after `stripe_customer_id`, add `payout_status` varchar(64) null after `stripe_recipient_id`, add `payout_method_id` varchar(128) null after `payout_status`;',
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_recipient_id`, drop column `payout_status`, drop column `payout_method_id`;',
    );
  }
}
