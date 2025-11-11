import { Migration } from '@mikro-orm/migrations';

export class Migration20250117123000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table `accounts` add `stripe_bank_name` varchar(120) null, add `stripe_bank_account_first_name` varchar(120) null, add `stripe_bank_account_last_name` varchar(120) null, add `requires_fraud_review` tinyint(1) not null default 0, add `fraud_review_reason` varchar(64) null, add `missed_payment_flag` tinyint(1) not null default 0, add `missed_payment_reason` varchar(128) null;',
    );
    this.addSql(
      'alter table `pod_memberships` add `payout_amount` decimal(15,2) null;',
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table `accounts` drop column `stripe_bank_name`, drop column `stripe_bank_account_first_name`, drop column `stripe_bank_account_last_name`, drop column `requires_fraud_review`, drop column `fraud_review_reason`, drop column `missed_payment_flag`, drop column `missed_payment_reason`;',
    );
    this.addSql('alter table `pod_memberships` drop column `payout_amount`;');
  }
}
