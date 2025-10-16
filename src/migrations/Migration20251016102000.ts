import { Migration } from '@mikro-orm/migrations';
import { randomUUID } from 'crypto';
import { AchievementCode } from '../modules/achievements/achievement-code.enum';

export class Migration20251016102000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      "create table `achievements` (`id` char(36) not null, `code` varchar(64) not null, `name` varchar(255) not null, `description` varchar(512) not null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql('alter table `achievements` add unique `achievements_code_unique`(`code`);');

    this.addSql(
      "create table `account_achievements` (`id` char(36) not null, `account_id` char(36) not null, `achievement_id` char(36) not null, `awarded_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );
    this.addSql('alter table `account_achievements` add unique `account_achievements_account_id_achievement_id_unique`(`account_id`, `achievement_id`);');
    this.addSql(
      'alter table `account_achievements` add constraint `account_achievements_account_id_foreign` foreign key (`account_id`) references `accounts` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `account_achievements` add constraint `account_achievements_achievement_id_foreign` foreign key (`achievement_id`) references `achievements` (`id`) on update cascade on delete cascade;',
    );

    const seed = [
      {
        code: AchievementCode.POD_STARTER,
        name: 'Pod Starter',
        description: 'Successfully join your first pod.',
      },
      {
        code: AchievementCode.COMMITMENT_CHAMP,
        name: 'Commitment Champ',
        description: 'Participate in at least three pods consecutively.',
      },
      {
        code: AchievementCode.EARLY_BIRD,
        name: 'Early Bird',
        description: 'Be the first to join a new pod.',
      },
      {
        code: AchievementCode.FINANCIALLY_FIT,
        name: 'Financially Fit',
        description: 'Successfully complete a pod lifecycle.',
      },
      {
        code: AchievementCode.POD_VETERAN,
        name: 'Pod Veteran',
        description: 'Complete more than ten pods.',
      },
      {
        code: AchievementCode.KOAJO_OG,
        name: 'Koajo OG',
        description: 'Be among the first 1000 users to complete a full pod cycle.',
      },
    ];

    for (const item of seed) {
      const id = randomUUID();
      const values = [
        `'${id}'`,
        `'${item.code}'`,
        `'${item.name.replace(/'/g, "''")}'`,
        `'${item.description.replace(/'/g, "''")}'`,
      ].join(', ');
      this.addSql(
        `insert into \`achievements\` (\`id\`, \`code\`, \`name\`, \`description\`) values (${values});`,
      );
    }
  }

  override async down(): Promise<void> {
    this.addSql('alter table `account_achievements` drop foreign key `account_achievements_account_id_foreign`;');
    this.addSql('alter table `account_achievements` drop foreign key `account_achievements_achievement_id_foreign`;');

    this.addSql('drop table if exists `account_achievements`;');
    this.addSql('drop table if exists `achievements`;');
  }
}
