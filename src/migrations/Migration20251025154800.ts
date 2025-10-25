import { Migration } from '@mikro-orm/migrations';

export class Migration20251025154800 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      "create table `avatars` (`id` varchar(64) not null, `alt_text` varchar(255) not null, `is_default` tinyint(1) not null default 0, `gender` varchar(16) not null, `created_at` datetime(6) not null default current_timestamp(6), `updated_at` datetime(6) not null default current_timestamp(6), primary key (`id`)) default character set utf8mb4 engine = InnoDB;",
    );

    const rows = [
      ["Man_Avatar-01_gdkkyc", "Professional man with short dark hair, wearing a navy blue business shirt, confident and authoritative expression", 1, "male"],
      ["Man_Avatar-03_jry0jo", "Young man with styled dark hair, wearing a light blue casual t-shirt and rectangular glasses, warm and approachable smile", 0, "male"],
      ["Man_Avatar-05_ldqocd", "Distinguished mature man with salt-and-pepper hair and well-trimmed beard, wearing a charcoal gray blazer, thoughtful and experienced demeanor", 0, "male"],
      ["Man_Avatar-10_ern3e2", "Athletic man with short cropped hair, wearing a fitted athletic t-shirt, dynamic and energetic expression", 0, "male"],
      ["Man_Avatar-11_nj8lfe", "Fashionable man with contemporary haircut, wearing a stylish button-down shirt, confident and trendy appearance", 0, "male"],
      ["Man_Avatar-12_o44rxh", "Relaxed man with medium-length tousled hair, wearing a comfortable gray hoodie, laid-back and friendly expression", 0, "male"],
      ["Man_Avatar-14_src6qd", "Clean-cut young professional man with neatly styled hair, wearing a crisp white dress shirt, polished and competent look", 0, "male"],
      ["Man_Avatar-16_vkfmec", "Sophisticated man with impeccably groomed hair, wearing a classic white dress shirt, distinguished and refined appearance", 0, "male"],
      ["Woman_Avatar-02_egpv4h", "Professional woman with shoulder-length styled hair, wearing a navy blue business blouse, confident and competent expression", 0, "female"],
      ["Woman_Avatar-04_s2uxkv", "Young woman with long wavy hair, wearing a soft pink casual top, bright and cheerful smile", 0, "female"],
      ["Woman_Avatar-06_cfbfei", "Fashionable woman with sleek bob haircut, wearing a chic patterned blouse, stylish and contemporary look", 0, "female"],
      ["Woman_Avatar-07_yrt8xt", "Elegant woman with shoulder-length wavy hair, wearing a sophisticated cream-colored top, graceful and refined expression", 0, "female"],
      ["Woman_Avatar-08_ygngqv", "Athletic woman with high ponytail, wearing a fitted athletic top, energetic and dynamic expression", 0, "female"],
      ["Woman_Avatar-09_rnh8gu", "Creative woman with artistic asymmetrical hairstyle, wearing a vibrant colorful top, expressive and artistic appearance", 0, "female"],
      ["Woman_Avatar-13_ug3crq", "Experienced woman with short professional haircut, wearing a structured business blouse, knowledgeable and authoritative look", 0, "female"],
      ["Woman_Avatar-15_boimth", "Relaxed woman with medium-length layered hair, wearing a cozy knit sweater, warm and approachable smile", 0, "female"],
      ["Woman_Avatar-17_wfwhh2", "Modern woman with contemporary layered hairstyle, wearing a stylish blouse, confident and independent expression", 0, "female"],
    ] as const;

    const timestamp = '2025-10-25 20:48:32';

    rows.forEach(([id, altText, isDefault, gender]) => {
      const escapedAltText = altText.replace(/'/g, "''");
      this.addSql(
        `insert into \`avatars\` (\`id\`, \`alt_text\`, \`is_default\`, \`gender\`, \`created_at\`, \`updated_at\`) values ('${id}', '${escapedAltText}', ${isDefault}, '${gender}', '${timestamp}', '${timestamp}');`,
      );
    });
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists `avatars`;');
  }
}
