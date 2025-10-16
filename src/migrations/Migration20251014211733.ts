import { Migration } from '@mikro-orm/migrations';

export class Migration20251014211733 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`pods\` (\`id\` char(36) not null, \`plan_code\` varchar(32) not null, \`amount\` int not null, \`lifecycle_weeks\` int not null, \`max_members\` int not null, \`status\` enum('open', 'grace', 'active', 'completed') not null default 'open', \`scheduled_start_date\` datetime(6) not null, \`start_date\` datetime(6) null, \`grace_ends_at\` datetime(6) null, \`locked_at\` datetime(6) null, \`completed_at\` datetime(6) null, \`cycles_completed\` int not null default 0, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`create table \`pod_memberships\` (\`id\` char(36) not null, \`pod_id\` char(36) not null, \`account_id\` char(36) null, \`public_id\` varchar(36) not null, \`is_system_bot\` tinyint(1) not null default false, \`join_order\` int not null default 0, \`final_order\` int null, \`payout_date\` datetime(6) null, \`joined_at\` datetime(6) not null default current_timestamp(6), \`paid_out\` tinyint(1) not null default false, \`auto_debited\` tinyint(1) not null default false, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`pod_memberships\` add index \`pod_memberships_pod_id_index\`(\`pod_id\`);`);
    this.addSql(`alter table \`pod_memberships\` add index \`pod_memberships_account_id_index\`(\`account_id\`);`);

    this.addSql(`alter table \`pod_memberships\` add constraint \`pod_memberships_pod_id_foreign\` foreign key (\`pod_id\`) references \`pods\` (\`id\`) on update cascade on delete cascade;`);
    this.addSql(`alter table \`pod_memberships\` add constraint \`pod_memberships_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`pod_memberships\` drop foreign key \`pod_memberships_pod_id_foreign\`;`);

    this.addSql(`drop table if exists \`pods\`;`);

    this.addSql(`drop table if exists \`pod_memberships\`;`);
  }

}
