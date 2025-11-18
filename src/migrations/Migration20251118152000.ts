import { Migration } from '@mikro-orm/migrations';

export class Migration20251118152000 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table `accounts` add `address` json null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table `accounts` drop column `address`;');
  }
}
