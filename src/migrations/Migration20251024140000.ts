import { Migration } from '@mikro-orm/migrations';
import { randomUUID } from 'crypto';
import { AchievementCode } from '../modules/achievements/achievement-code.enum';

export class Migration20251024140000 extends Migration {
  override async up(): Promise<void> {
    const entries = [
      {
        code: AchievementCode.FIRST_PAYOUT,
        name: 'First Payout',
        description: 'Receive your first payout from a pod.',
      },
      {
        code: AchievementCode.SAVINGS_SPRINTER,
        name: 'Savings Sprinter',
        description: 'Complete a pod cycle without missing any contributions.',
      },
      {
        code: AchievementCode.WEALTH_BUILDER,
        name: 'Wealth Builder',
        description: 'Accumulate at least 5,000 in total savings across all pods.',
      },
      {
        code: AchievementCode.SIX_FIGURES_ROCKSTAR,
        name: '6 Figures Rockstar',
        description: 'Save a total of 100,000 or more across all pods.',
      },
      {
        code: AchievementCode.ON_TIME_HERO,
        name: 'On-Time Hero',
        description: 'Make every contribution on schedule for an entire pod cycle.',
      },
      {
        code: AchievementCode.PERFECT_STREAK,
        name: 'Perfect Streak',
        description: 'Maintain a multi-month streak of consistent savings contributions.',
      },
      {
        code: AchievementCode.SAVINGS_CHAMPION,
        name: 'Savings Champion',
        description: 'Reach a total savings milestone of 20,000 or more across all pods.',
      },
    ];

    for (const entry of entries) {
      const id = randomUUID();
      const values = [
        `'${id}'`,
        `'${entry.code}'`,
        `'${entry.name.replace(/'/g, "''")}'`,
        `'${entry.description.replace(/'/g, "''")}'`,
      ].join(', ');
      this.addSql(
        `insert into \`achievements\` (\`id\`, \`code\`, \`name\`, \`description\`) values (${values});`,
      );
    }
  }

  override async down(): Promise<void> {
    const codes = [
      AchievementCode.FIRST_PAYOUT,
      AchievementCode.SAVINGS_SPRINTER,
      AchievementCode.WEALTH_BUILDER,
      AchievementCode.SIX_FIGURES_ROCKSTAR,
      AchievementCode.ON_TIME_HERO,
      AchievementCode.PERFECT_STREAK,
      AchievementCode.SAVINGS_CHAMPION,
    ]
      .map((code) => `'${code}'`)
      .join(', ');

    this.addSql(
      `delete from \`achievements\` where \`code\` in (${codes});`,
    );
  }
}
