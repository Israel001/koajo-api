import { Migration } from '@mikro-orm/migrations';

export class Migration20251015094309 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`pod_plans\` (\`id\` char(36) not null, \`code\` varchar(32) not null, \`amount\` int not null, \`lifecycle_weeks\` int not null, \`max_members\` int not null, \`active\` tinyint(1) not null default true, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`pod_plans\` add unique \`pod_plans_code_unique\`(\`code\`);`);

    this.addSql(`alter table \`pods\` add \`checksum\` varchar(128) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`pod_plans\`;`);

    this.addSql(`alter table \`pods\` drop column \`checksum\`;`);
  }

}
