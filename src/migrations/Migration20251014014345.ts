import { Migration } from '@mikro-orm/migrations';

export class Migration20251014014345 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`accounts\` (\`id\` char(36) not null, \`email\` varchar(320) not null, \`phone_number\` varchar(20) not null, \`password_hash\` varchar(255) not null, \`checksum\` varchar(128) not null, \`email_verified_at\` datetime(6) null, \`created_at\` datetime(6) not null default current_timestamp(6), \`updated_at\` datetime(6) not null default current_timestamp(6), \`version\` int unsigned not null default 1, primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`accounts\` add unique \`accounts_email_unique\`(\`email\`);`);
    this.addSql(`alter table \`accounts\` add unique \`accounts_phone_number_unique\`(\`phone_number\`);`);

    this.addSql(`create table \`account_email_verifications\` (\`id\` char(36) not null, \`account_id\` char(36) not null, \`code_digest\` varchar(128) not null, \`failed_attempts\` int not null default 0, \`expires_at\` datetime(6) not null, \`consumed_at\` datetime(6) null, \`created_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`account_email_verifications\` add index \`account_email_verifications_account_id_index\`(\`account_id\`);`);
    this.addSql(`alter table \`account_email_verifications\` add index \`account_email_verifications_account_id_created_at_index\`(\`account_id\`, \`created_at\`);`);

    this.addSql(`create table \`notification_templates\` (\`code\` varchar(150) not null, \`body\` longtext not null, primary key (\`code\`)) default character set utf8mb4 engine = InnoDB;`);

    this.addSql(`alter table \`account_email_verifications\` add constraint \`account_email_verifications_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`account_email_verifications\` drop foreign key \`account_email_verifications_account_id_foreign\`;`);

    this.addSql(`drop table if exists \`accounts\`;`);

    this.addSql(`drop table if exists \`account_email_verifications\`;`);

    this.addSql(`drop table if exists \`notification_templates\`;`);
  }

}
