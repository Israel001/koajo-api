import { Migration } from '@mikro-orm/migrations';

export class Migration20251017103000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "alter table `pods` add `type` varchar(16) not null default 'system';",
    );
    this.addSql('alter table `pods` add `creator_id` char(36) null;');
    this.addSql('alter table `pods` add `cadence` varchar(16) null;');
    this.addSql('alter table `pods` add `randomize_payout_order` tinyint(1) not null default 0;');
    this.addSql('alter table `pods` add `expected_member_count` int null;');
    this.addSql('alter table `pods` modify `scheduled_start_date` datetime(6) null;');
    this.addSql('alter table `pods` add `next_contribution_date` datetime(6) null;');
    this.addSql('alter table `pods` add `next_payout_date` datetime(6) null;');
    this.addSql('alter table `pods` add `invite_checksum` varchar(128) null;');
    this.addSql(
      'alter table `pods` add constraint `pods_creator_id_foreign` foreign key (`creator_id`) references `accounts` (`id`) on update cascade on delete set null;',
    );

    this.addSql(
      "create table `pod_invites` (`id` char(36) not null, `pod_id` char(36) not null, `email` varchar(320) not null, `invite_order` int not null, `token_digest` varchar(128) not null, `invited_at` datetime(6) not null default current_timestamp(6), `accepted_at` datetime(6) null, `account_id` char(36) null, `checksum` varchar(128) null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql('alter table `pod_invites` add unique `pod_invites_token_digest_unique`(`token_digest`);');
    this.addSql('alter table `pod_invites` add unique `pod_invites_pod_id_email_unique`(`pod_id`, `email`);');
    this.addSql(
      'alter table `pod_invites` add constraint `pod_invites_pod_id_foreign` foreign key (`pod_id`) references `pods` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `pod_invites` add constraint `pod_invites_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete set null;',
    );
  }

  override async down(): Promise<void> {
    this.addSql('alter table `pod_invites` drop foreign key `pod_invites_account_id_foreign`;');
    this.addSql('alter table `pod_invites` drop foreign key `pod_invites_pod_id_foreign`;');
    this.addSql('drop table if exists `pod_invites`;');

    this.addSql('alter table `pods` drop foreign key `pods_creator_id_foreign`;');
    this.addSql('alter table `pods` drop `invite_checksum`;');
    this.addSql('alter table `pods` drop `next_payout_date`;');
    this.addSql('alter table `pods` drop `next_contribution_date`;');
    this.addSql('alter table `pods` modify `scheduled_start_date` datetime(6) not null;');
    this.addSql('alter table `pods` drop `expected_member_count`;');
    this.addSql('alter table `pods` drop `randomize_payout_order`;');
    this.addSql('alter table `pods` drop `cadence`;');
    this.addSql('alter table `pods` drop `creator_id`;');
    this.addSql('alter table `pods` drop `type`;');
  }
}
