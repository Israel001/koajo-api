import { Migration } from '@mikro-orm/migrations';

export class Migration20251031104902 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table \`accounts\` modify \`version\` int unsigned not null default 1;`,
    );

    this.addSql(
      `alter table \`admin_permissions\` modify \`updated_at\` datetime(6) not null default current_timestamp(6);`,
    );

    this.addSql(
      `alter table \`admin_roles\` modify \`updated_at\` datetime(6) not null default current_timestamp(6);`,
    );

    this.addSql(
      `alter table \`admin_role_permissions\` drop column \`created_at\`;`,
    );

    this.addSql(
      `alter table \`admin_role_permissions\` add index \`admin_role_permissions_admin_role_id_index\`(\`admin_role_id\`);`,
    );
    this.addSql(
      `alter table \`admin_role_permissions\` rename index \`admin_role_permissions_admin_permission_id_foreign\` to \`admin_role_permissions_admin_permission_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_users\` modify \`role\` varchar(32) not null default 'admin';`,
    );

    this.addSql(
      `alter table \`admin_password_resets\` drop index \`admin_password_resets_created_at_index\`;`,
    );

    this.addSql(
      `alter table \`admin_password_resets\` add index \`admin_password_resets_admin_id_created_at_index\`(\`admin_id\`, \`created_at\`);`,
    );

    this.addSql(
      `alter table \`admin_user_roles\` add index \`admin_user_roles_admin_user_id_index\`(\`admin_user_id\`);`,
    );
    this.addSql(
      `alter table \`admin_user_roles\` rename index \`admin_user_roles_admin_role_id_foreign\` to \`admin_user_roles_admin_role_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permissions\` add index \`admin_user_permissions_admin_user_id_index\`(\`admin_user_id\`);`,
    );
    this.addSql(
      `alter table \`admin_user_permissions\` rename index \`admin_user_permissions_admin_permission_id_foreign\` to \`admin_user_permissions_admin_permission_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permission_overrides\` modify \`type\` enum('allow', 'deny') not null default 'allow';`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` add index \`admin_user_permission_overrides_user_id_index\`(\`user_id\`);`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` rename index \`admin_user_permission_overrides_permission_id_foreign\` to \`admin_user_permission_overrides_permission_id_index\`;`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` drop index \`admin_user_permission_overrides_user_permission_unique\`;`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` add unique \`admin_user_permission_overrides_user_id_permission_id_unique\`(\`user_id\`, \`permission_id\`);`,
    );

    this.addSql(`alter table \`pods\` add \`name\` varchar(120) null;`);
    this.addSql(
      `alter table \`pods\` modify \`status\` enum('pending', 'open', 'grace', 'active', 'completed') not null default 'open', modify \`type\` enum('system', 'custom') not null default 'system', modify \`cadence\` enum('bi-weekly', 'monthly');`,
    );
    this.addSql(
      `alter table \`pods\` rename index \`pods_creator_id_foreign\` to \`pods_creator_id_index\`;`,
    );

    this.addSql(
      `alter table \`pod_invites\` drop index \`pod_invites_pod_id_email_unique\`;`,
    );
    this.addSql(
      `alter table \`pod_invites\` drop index \`pod_invites_token_digest_unique\`;`,
    );

    this.addSql(
      `alter table \`pod_invites\` modify \`invite_order\` int not null default 0;`,
    );
    this.addSql(
      `alter table \`pod_invites\` add index \`pod_invites_pod_id_index\`(\`pod_id\`);`,
    );
    this.addSql(
      `alter table \`pod_invites\` rename index \`pod_invites_account_id_foreign\` to \`pod_invites_account_id_index\`;`,
    );

    this.addSql(
      `alter table \`pod_memberships\` modify \`total_contributed\` decimal(15,2) not null default '0.00';`,
    );

    this.addSql(
      `alter table \`pod_activities\` modify \`type\` enum('pod_created', 'pod_activated', 'member_joined', 'invite_sent', 'invite_accepted', 'contribution_recorded', 'payout_recorded', 'membership_completed', 'pod_completed') not null;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table \`pod_memberships\` modify \`total_contributed\` decimal(15,2) not null default 0.00;`,
    );

    this.addSql(`alter table \`pods\` drop column \`name\`;`);

    this.addSql(
      `alter table \`pods\` modify \`type\` varchar(16) not null default 'system', modify \`status\` enum('open', 'grace', 'active', 'completed') not null default 'open', modify \`cadence\` varchar(16);`,
    );
    this.addSql(
      `alter table \`pods\` rename index \`pods_creator_id_index\` to \`pods_creator_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`pod_invites\` drop index \`pod_invites_pod_id_index\`;`,
    );

    this.addSql(
      `alter table \`pod_invites\` modify \`invite_order\` int not null;`,
    );
    this.addSql(
      `alter table \`pod_invites\` add unique \`pod_invites_pod_id_email_unique\`(\`pod_id\`, \`email\`);`,
    );
    this.addSql(
      `alter table \`pod_invites\` add unique \`pod_invites_token_digest_unique\`(\`token_digest\`);`,
    );
    this.addSql(
      `alter table \`pod_invites\` rename index \`pod_invites_account_id_index\` to \`pod_invites_account_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`pod_activities\` modify \`type\` varchar(64) not null;`,
    );

    this.addSql(
      `alter table \`accounts\` modify \`version\` int unsigned not null default 1;`,
    );

    this.addSql(
      `alter table \`admin_roles\` modify \`updated_at\` datetime(6) not null default current_timestamp(6) on update CURRENT_TIMESTAMP(6);`,
    );

    this.addSql(
      `alter table \`admin_permissions\` modify \`updated_at\` datetime(6) not null default current_timestamp(6) on update CURRENT_TIMESTAMP(6);`,
    );

    this.addSql(
      `alter table \`admin_role_permissions\` drop index \`admin_role_permissions_admin_role_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_role_permissions\` add \`created_at\` datetime(6) not null default current_timestamp(6);`,
    );
    this.addSql(
      `alter table \`admin_role_permissions\` rename index \`admin_role_permissions_admin_permission_id_index\` to \`admin_role_permissions_admin_permission_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`admin_user_roles\` drop index \`admin_user_roles_admin_user_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_user_roles\` rename index \`admin_user_roles_admin_role_id_index\` to \`admin_user_roles_admin_role_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permissions\` drop index \`admin_user_permissions_admin_user_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permissions\` rename index \`admin_user_permissions_admin_permission_id_index\` to \`admin_user_permissions_admin_permission_id_foreign\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permission_overrides\` drop index \`admin_user_permission_overrides_user_id_index\`;`,
    );

    this.addSql(
      `alter table \`admin_user_permission_overrides\` modify \`type\` varchar(16) not null;`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` rename index \`admin_user_permission_overrides_permission_id_index\` to \`admin_user_permission_overrides_permission_id_foreign\`;`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` drop index \`admin_user_permission_overrides_user_id_permission_id_unique\`;`,
    );
    this.addSql(
      `alter table \`admin_user_permission_overrides\` add unique \`admin_user_permission_overrides_user_permission_unique\`(\`user_id\`, \`permission_id\`);`,
    );

    this.addSql(
      `alter table \`admin_password_resets\` drop index \`admin_password_resets_admin_id_created_at_index\`;`,
    );

    this.addSql(
      `alter table \`admin_password_resets\` add index \`admin_password_resets_created_at_index\`(\`created_at\`);`,
    );

    this.addSql(
      `alter table \`admin_users\` modify \`role\` varchar(32) not null;`,
    );
  }
}
