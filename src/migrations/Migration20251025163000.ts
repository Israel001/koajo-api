import { Migration } from '@mikro-orm/migrations';

export class Migration20251025163000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `pod_activities` (`id` char(36) not null, `pod_id` char(36) not null, `membership_id` char(36) null, `account_id` char(36) null, `type` varchar(64) not null, `metadata` json null, `created_at` datetime(6) not null default current_timestamp(6), index `pod_activities_pod_id_index`(`pod_id`), index `pod_activities_membership_id_index`(`membership_id`), index `pod_activities_account_id_index`(`account_id`), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      'alter table `pod_activities` add constraint `pod_activities_pod_id_foreign` foreign key (`pod_id`) references `pods` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `pod_activities` add constraint `pod_activities_membership_id_foreign` foreign key (`membership_id`) references `pod_memberships` (`id`) on update cascade on delete set null;',
    );

    this.addSql(
      'alter table `pod_activities` add constraint `pod_activities_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete set null;',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `pod_activities`;');
  }
}
