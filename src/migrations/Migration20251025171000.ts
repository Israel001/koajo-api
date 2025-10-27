import { Migration } from '@mikro-orm/migrations';

export class Migration20251025171000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "alter table `accounts` add `date_of_birth` date null, add `agreed_to_terms` tinyint(1) not null default 0, add `stripe_identity_id` varchar(128) null, add `stripe_identity_result_id` varchar(128) null, add `stripe_customer_id` varchar(128) null, add `stripe_customer_ssn_last4` varchar(4) null, add `stripe_customer_address` json null, add `stripe_bank_account_id` varchar(128) null, add `stripe_bank_account_customer_id` varchar(128) null, add `last_login_at` datetime(6) null;",
    );

    this.addSql(
      "alter table `account_verification_attempts` add `provider_reference` varchar(128) null, add `result_id` varchar(128) null;",
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table `accounts` drop `date_of_birth`, drop `agreed_to_terms`, drop `stripe_identity_id`, drop `stripe_identity_result_id`, drop `stripe_customer_id`, drop `stripe_customer_ssn_last4`, drop `stripe_customer_address`, drop `stripe_bank_account_id`, drop `stripe_bank_account_customer_id`, drop `last_login_at`;');

    this.addSql('alter table `account_verification_attempts` drop `provider_reference`, drop `result_id`;');
  }
}
