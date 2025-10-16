import { Migration } from '@mikro-orm/migrations';

export class Migration20251014173821 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`account_password_resets\` (\`id\` char(36) not null, \`account_id\` char(36) not null, \`token_digest\` varchar(128) not null, \`failed_attempts\` int not null default 0, \`expires_at\` datetime(6) not null, \`consumed_at\` datetime(6) null, \`created_at\` datetime(6) not null default current_timestamp(6), primary key (\`id\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`alter table \`account_password_resets\` add index \`account_password_resets_account_id_index\`(\`account_id\`);`);
    this.addSql(`alter table \`account_password_resets\` add index \`account_password_resets_account_id_created_at_index\`(\`account_id\`, \`created_at\`);`);

    this.addSql(`alter table \`account_password_resets\` add constraint \`account_password_resets_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`account_password_resets\`;`);
  }

}
