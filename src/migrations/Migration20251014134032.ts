import { Migration } from '@mikro-orm/migrations';

export class Migration20251014134032 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`accounts\` add \`stripe_verification_completed\` tinyint(1) not null default false;`);
    this.addSql(`alter table \`accounts\` modify \`first_name\` varchar(60) null, modify \`last_name\` varchar(60) null, modify \`version\` int unsigned not null default 1;`);

    this.addSql(`alter table \`account_email_verifications\` add constraint \`account_email_verifications_account_id_foreign\` foreign key (\`account_id\`) references \`accounts\` (\`id\`) on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`account_email_verifications\` drop foreign key \`account_email_verifications_account_id_foreign\`;`);

    this.addSql(`alter table \`accounts\` drop column \`stripe_verification_completed\`;`);

    this.addSql(`alter table \`accounts\` modify \`first_name\` varchar(60) not null, modify \`last_name\` varchar(60) not null, modify \`version\` int unsigned not null default 1;`);
  }

}
