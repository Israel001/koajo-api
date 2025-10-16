import { Migration } from '@mikro-orm/migrations';

export class Migration20251014021500 extends Migration {

  override async up(): Promise<void> {
    this.addSql("alter table `accounts` add `first_name` varchar(60) not null default '' after `email`;");
    this.addSql("alter table `accounts` add `last_name` varchar(60) not null default '' after `first_name`;");
    this.addSql("update `accounts` set `first_name` = substring_index(`email`, '@', 1) where `first_name` = '';");
    this.addSql("alter table `accounts` modify `first_name` varchar(60) not null;");
    this.addSql("alter table `accounts` modify `last_name` varchar(60) not null;");
  }

  override async down(): Promise<void> {
    this.addSql('alter table `accounts` drop `last_name`;');
    this.addSql('alter table `accounts` drop `first_name`;');
  }

}
