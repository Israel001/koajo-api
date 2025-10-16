import { Migration } from '@mikro-orm/migrations';

export class Migration20251016112251 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table \`accounts\` add \`stripe_verification_attempt_count\` int unsigned not null default 0, add \`stripe_verification_first_attempt_at\` datetime(6) null, add \`stripe_verification_last_attempt_at\` datetime(6) null, add \`stripe_verification_status\` varchar(64) null;`);
    this.addSql(`alter table \`accounts\` modify \`version\` int unsigned not null default 1;`);

    this.addSql(`alter table \`account_achievements\` add index \`account_achievements_account_id_index\`(\`account_id\`);`);
    this.addSql(`alter table \`account_achievements\` rename index \`account_achievements_achievement_id_foreign\` to \`account_achievements_achievement_id_index\`;`);

    this.addSql(`alter table \`pod_memberships\` modify \`total_contributed\` decimal(15,2) not null default '0.00';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table \`account_achievements\` drop index \`account_achievements_account_id_index\`;`);

    this.addSql(`alter table \`account_achievements\` rename index \`account_achievements_achievement_id_index\` to \`account_achievements_achievement_id_foreign\`;`);

    this.addSql(`alter table \`accounts\` drop column \`stripe_verification_attempt_count\`, drop column \`stripe_verification_first_attempt_at\`, drop column \`stripe_verification_last_attempt_at\`, drop column \`stripe_verification_status\`;`);

    this.addSql(`alter table \`accounts\` modify \`version\` int unsigned not null default 1;`);

    this.addSql(`alter table \`pod_memberships\` modify \`total_contributed\` decimal(15,2) not null default 0.00;`);
  }

}
