import { Migration } from '@mikro-orm/migrations';

export class Migration20251025193000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `admin_roles` (`id` char(36) not null, `name` varchar(64) not null, `description` text null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6) on update current_timestamp(6), unique `admin_roles_name_unique`(`name`), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_permissions` (`id` char(36) not null, `code` varchar(128) not null, `name` varchar(255) null, `description` text null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6) on update current_timestamp(6), unique `admin_permissions_code_unique`(`code`), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_role_permissions` (`admin_role_id` char(36) not null, `admin_permission_id` char(36) not null, `created_at` datetime(6) not null default current_timestamp(6), primary key (`admin_role_id`, `admin_permission_id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_user_roles` (`admin_user_id` char(36) not null, `admin_role_id` char(36) not null, primary key (`admin_user_id`, `admin_role_id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_user_permissions` (`admin_user_id` char(36) not null, `admin_permission_id` char(36) not null, primary key (`admin_user_id`, `admin_permission_id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_user_permission_overrides` (`id` char(36) not null, `user_id` char(36) not null, `permission_id` char(36) not null, `type` varchar(16) not null, `created_at` datetime(6) not null default current_timestamp(6), unique `admin_user_permission_overrides_user_permission_unique`(`user_id`, `permission_id`), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "create table `admin_password_resets` (`id` char(36) not null, `admin_id` char(36) not null, `token_digest` varchar(128) not null, `failed_attempts` int not null default 0, `expires_at` datetime(6) not null, `consumed_at` datetime(6) null, `created_at` datetime(6) not null default current_timestamp(6), index `admin_password_resets_admin_id_index`(`admin_id`), index `admin_password_resets_created_at_index`(`created_at`), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    this.addSql(
      "alter table `admin_users` add `first_name` varchar(60) null, add `last_name` varchar(60) null, add `phone_number` varchar(32) null, add `is_active` tinyint(1) not null default 1, add `requires_password_change` tinyint(1) not null default 0, add `invited_at` datetime(6) null, add `invited_by_id` char(36) null, add `password_changed_at` datetime(6) null;",
    );

    this.addSql(
      'alter table `admin_role_permissions` add constraint `admin_role_permissions_admin_role_id_foreign` foreign key (`admin_role_id`) references `admin_roles` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `admin_role_permissions` add constraint `admin_role_permissions_admin_permission_id_foreign` foreign key (`admin_permission_id`) references `admin_permissions` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `admin_user_roles` add constraint `admin_user_roles_admin_user_id_foreign` foreign key (`admin_user_id`) references `admin_users` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `admin_user_roles` add constraint `admin_user_roles_admin_role_id_foreign` foreign key (`admin_role_id`) references `admin_roles` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `admin_user_permissions` add constraint `admin_user_permissions_admin_user_id_foreign` foreign key (`admin_user_id`) references `admin_users` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `admin_user_permissions` add constraint `admin_user_permissions_admin_permission_id_foreign` foreign key (`admin_permission_id`) references `admin_permissions` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `admin_user_permission_overrides` add constraint `admin_user_permission_overrides_user_id_foreign` foreign key (`user_id`) references `admin_users` (`id`) on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table `admin_user_permission_overrides` add constraint `admin_user_permission_overrides_permission_id_foreign` foreign key (`permission_id`) references `admin_permissions` (`id`) on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table `admin_password_resets` add constraint `admin_password_resets_admin_id_foreign` foreign key (`admin_id`) references `admin_users` (`id`) on update cascade on delete cascade;',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table `admin_role_permissions` drop foreign key `admin_role_permissions_admin_role_id_foreign`;');
    this.addSql('alter table `admin_role_permissions` drop foreign key `admin_role_permissions_admin_permission_id_foreign`;');
    this.addSql('alter table `admin_user_roles` drop foreign key `admin_user_roles_admin_user_id_foreign`;');
    this.addSql('alter table `admin_user_roles` drop foreign key `admin_user_roles_admin_role_id_foreign`;');
    this.addSql('alter table `admin_user_permissions` drop foreign key `admin_user_permissions_admin_user_id_foreign`;');
    this.addSql('alter table `admin_user_permissions` drop foreign key `admin_user_permissions_admin_permission_id_foreign`;');
    this.addSql('alter table `admin_user_permission_overrides` drop foreign key `admin_user_permission_overrides_user_id_foreign`;');
    this.addSql('alter table `admin_user_permission_overrides` drop foreign key `admin_user_permission_overrides_permission_id_foreign`;');
    this.addSql('alter table `admin_password_resets` drop foreign key `admin_password_resets_admin_id_foreign`;');

    this.addSql('alter table `admin_users` drop `first_name`, drop `last_name`, drop `phone_number`, drop `is_active`, drop `requires_password_change`, drop `invited_at`, drop `invited_by_id`, drop `password_changed_at`;');

    this.addSql('drop table if exists `admin_role_permissions`;');
    this.addSql('drop table if exists `admin_user_roles`;');
    this.addSql('drop table if exists `admin_user_permissions`;');
    this.addSql('drop table if exists `admin_user_permission_overrides`;');
    this.addSql('drop table if exists `admin_password_resets`;');
    this.addSql('drop table if exists `admin_roles`;');
    this.addSql('drop table if exists `admin_permissions`;');
  }
}
