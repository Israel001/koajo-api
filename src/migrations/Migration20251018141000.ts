import { Migration } from '@mikro-orm/migrations';

export class Migration20251018141000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table `account_verification_attempts` (`id` char(36) not null, `account_id` char(36) not null, `provider` varchar(64) not null, `type` varchar(64) not null, `session_id` varchar(128) not null, `status` varchar(64) not null, `completed_at` datetime(6) null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `account_verification_attempts` add index `account_verification_attempts_account_id_index`(`account_id`);',
    );
    this.addSql(
      'alter table `account_verification_attempts` add constraint `account_verification_attempts_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `accounts` drop `stripe_verification_attempt_count`;',
    );
    this.addSql(
      'alter table `accounts` drop `stripe_verification_first_attempt_at`;',
    );
    this.addSql(
      'alter table `accounts` drop `stripe_verification_last_attempt_at`;',
    );
    this.addSql(
      'alter table `accounts` drop `stripe_verification_status`;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `account_verification_attempts` drop foreign key `account_verification_attempts_account_id_foreign`;');
    this.addSql('drop table if exists `account_verification_attempts`;');

    this.addSql(
      'alter table `accounts` add `stripe_verification_attempt_count` int unsigned not null default 0;',
    );
    this.addSql(
      'alter table `accounts` add `stripe_verification_first_attempt_at` datetime(6) null;',
    );
    this.addSql(
      'alter table `accounts` add `stripe_verification_last_attempt_at` datetime(6) null;',
    );
    this.addSql(
      'alter table `accounts` add `stripe_verification_status` varchar(64) null;',
    );
  }
}
