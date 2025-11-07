import { Migration } from '@mikro-orm/migrations';

export class Migration20250117120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table `account_verification_attempts` add `stripe_session_payload` json null, add `stripe_session_retrieved_at` datetime(6) null;',
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table `account_verification_attempts` drop column `stripe_session_payload`, drop column `stripe_session_retrieved_at`;',
    );
  }
}
