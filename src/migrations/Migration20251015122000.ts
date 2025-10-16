import { randomUUID } from 'crypto';
import { Migration } from '@mikro-orm/migrations';

export class Migration20251015122000 extends Migration {
  override async up(): Promise<void> {
    const seedPlans = [
      { code: '100-12', amount: 100, lifecycleWeeks: 12, maxMembers: 6 },
      { code: '100-24', amount: 100, lifecycleWeeks: 24, maxMembers: 12 },
      { code: '200-12', amount: 200, lifecycleWeeks: 12, maxMembers: 6 },
      { code: '200-24', amount: 200, lifecycleWeeks: 24, maxMembers: 12 },
      { code: '500-12', amount: 500, lifecycleWeeks: 12, maxMembers: 6 },
      { code: '500-24', amount: 500, lifecycleWeeks: 24, maxMembers: 12 },
      { code: '1000-12', amount: 1000, lifecycleWeeks: 12, maxMembers: 6 },
      { code: '1000-24', amount: 1000, lifecycleWeeks: 24, maxMembers: 12 },
    ];

    for (const plan of seedPlans) {
      this.addSql(
        `insert into \`pod_plans\` (\`id\`, \`code\`, \`amount\`, \`lifecycle_weeks\`, \`max_members\`, \`active\`) values ('${randomUUID()}', '${plan.code}', ${plan.amount}, ${plan.lifecycleWeeks}, ${plan.maxMembers}, 1);`,
      );
    }
  }

  override async down(): Promise<void> {}
}
