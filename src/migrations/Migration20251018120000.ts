import { Migration } from '@mikro-orm/migrations';
import { randomUUID } from 'crypto';
import { AchievementCode } from '../modules/achievements/achievement-code.enum';

export class Migration20251018120000 extends Migration {
  override async up(): Promise<void> {
    const items = [
      {
        code: AchievementCode.KOAJO_CONNECTOR,
        name: 'Koajo Connector',
        description: 'Have at least one invited member join your custom pod.',
      },
      {
        code: AchievementCode.POD_LEADER,
        name: 'Pod Leader',
        description: 'Fill your custom pod by having every invitee join.',
      },
      {
        code: AchievementCode.TEAM_PLAYER,
        name: 'Team Player',
        description: 'Complete five pods with the same group of members.',
      },
      {
        code: AchievementCode.REFERRAL_MASTER,
        name: 'Referral Master',
        description: 'Bring three invitees into one of your custom pods.',
      },
    ];

    for (const item of items) {
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
    const codes = [
      AchievementCode.KOAJO_CONNECTOR,
      AchievementCode.POD_LEADER,
      AchievementCode.TEAM_PLAYER,
      AchievementCode.REFERRAL_MASTER,
    ]
      .map((code) => `'${code}'`)
      .join(', ');

    this.addSql(
      `delete from \`achievements\` where \`code\` in (${codes});`,
    );
  }
}
