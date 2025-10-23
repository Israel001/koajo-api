import { Migration } from '@mikro-orm/migrations';

export class Migration20251018150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      'alter table `account_verification_attempts` add `stripe_reference` varchar(128) null;',
    );

    this.addSql(
      "create table `payments` (`id` char(36) not null, `account_id` char(36) not null, `pod_id` char(36) not null, `membership_id` char(36) not null, `stripe_reference` varchar(128) not null, `amount` decimal(15,2) not null, `currency` varchar(16) not null, `status` varchar(64) not null, `description` varchar(255) null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `payments` add unique `payments_stripe_reference_unique`(`stripe_reference`);',
    );
    this.addSql(
      'alter table `payments` add index `payments_account_id_index`(`account_id`);',
    );
    this.addSql(
      'alter table `payments` add index `payments_pod_id_index`(`pod_id`);',
    );
    this.addSql(
      'alter table `payments` add index `payments_membership_id_index`(`membership_id`);',
    );

    this.addSql(
      "create table `payouts` (`id` char(36) not null, `account_id` char(36) not null, `pod_id` char(36) not null, `membership_id` char(36) not null, `stripe_reference` varchar(128) not null, `amount` decimal(15,2) not null, `fee` decimal(15,2) not null, `currency` varchar(16) not null, `status` varchar(64) not null, `description` varchar(255) null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `payouts` add unique `payouts_stripe_reference_unique`(`stripe_reference`);',
    );
    this.addSql(
      'alter table `payouts` add index `payouts_account_id_index`(`account_id`);',
    );
    this.addSql(
      'alter table `payouts` add index `payouts_pod_id_index`(`pod_id`);',
    );
    this.addSql(
      'alter table `payouts` add index `payouts_membership_id_index`(`membership_id`);',
    );

    this.addSql(
      "create table `transactions` (`id` char(36) not null, `account_id` char(36) not null, `pod_id` char(36) not null, `membership_id` char(36) not null, `payment_id` char(36) null, `payout_id` char(36) null, `type` enum('payment', 'payout') not null default 'payment', `stripe_reference` varchar(128) not null, `amount` decimal(15,2) not null, `currency` varchar(16) not null, `status` varchar(64) not null, `description` varchar(255) null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql(
      'alter table `transactions` add index `transactions_account_id_index`(`account_id`);',
    );
    this.addSql(
      'alter table `transactions` add index `transactions_pod_id_index`(`pod_id`);',
    );
    this.addSql(
      'alter table `transactions` add index `transactions_membership_id_index`(`membership_id`);',
    );
    this.addSql(
      'alter table `transactions` add index `transactions_payment_id_index`(`payment_id`);',
    );
    this.addSql(
      'alter table `transactions` add index `transactions_payout_id_index`(`payout_id`);',
    );

    this.addSql(
      'alter table `payments` add constraint `payments_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `payments` add constraint `payments_pod_id_foreign` foreign key (`pod_id`) references `pods` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `payments` add constraint `payments_membership_id_foreign` foreign key (`membership_id`) references `pod_memberships` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `payouts` add constraint `payouts_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `payouts` add constraint `payouts_pod_id_foreign` foreign key (`pod_id`) references `pods` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `payouts` add constraint `payouts_membership_id_foreign` foreign key (`membership_id`) references `pod_memberships` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `transactions` add constraint `transactions_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `transactions` add constraint `transactions_pod_id_foreign` foreign key (`pod_id`) references `pods` (`id`) on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table `transactions` add constraint `transactions_membership_id_foreign` foreign key (`membership_id`) references `pod_memberships` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `transactions` add constraint `transactions_payment_id_foreign` foreign key (`payment_id`) references `payments` (`id`) on update cascade on delete set null;',
    );
    this.addSql(
      'alter table `transactions` add constraint `transactions_payout_id_foreign` foreign key (`payout_id`) references `payouts` (`id`) on update cascade on delete set null;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `transactions` drop foreign key `transactions_payment_id_foreign`;');
    this.addSql('alter table `transactions` drop foreign key `transactions_payout_id_foreign`;');
    this.addSql('alter table `transactions` drop foreign key `transactions_account_id_foreign`;');
    this.addSql('alter table `transactions` drop foreign key `transactions_pod_id_foreign`;');
    this.addSql('alter table `transactions` drop foreign key `transactions_membership_id_foreign`;');
    this.addSql('drop table if exists `transactions`;');

    this.addSql('alter table `payouts` drop foreign key `payouts_account_id_foreign`;');
    this.addSql('alter table `payouts` drop foreign key `payouts_pod_id_foreign`;');
    this.addSql('alter table `payouts` drop foreign key `payouts_membership_id_foreign`;');
    this.addSql('drop table if exists `payouts`;');

    this.addSql('alter table `payments` drop foreign key `payments_account_id_foreign`;');
    this.addSql('alter table `payments` drop foreign key `payments_pod_id_foreign`;');
    this.addSql('alter table `payments` drop foreign key `payments_membership_id_foreign`;');
    this.addSql('drop table if exists `payments`;');

    this.addSql(
      'alter table `account_verification_attempts` drop `stripe_reference`;',
    );
  }
}
