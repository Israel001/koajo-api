import { Migration } from '@mikro-orm/migrations';

export class Migration20251118131000 extends Migration {
  async up(): Promise<void> {
    this.addSql('delete from `avatars`;');

    const rows = [
      ['man_1_gpzznt.png', 'Man avatar 1', 1, 'male'],
      ['man_2_dywpop.png', 'Man avatar 2', 0, 'male'],
      ['man_3_vqizi1.png', 'Man avatar 3', 0, 'male'],
      ['man_4_ythnaw.png', 'Man avatar 4', 0, 'male'],
      ['man_5_au3nha.png', 'Man avatar 5', 0, 'male'],
      ['man_6_rz0gf5.png', 'Man avatar 6', 0, 'male'],
      ['man_7_vsxzft.png', 'Man avatar 7', 0, 'male'],
      ['man_8_q01r5r.png', 'Man avatar 8', 0, 'male'],
      ['man_9_gebcgp.png', 'Man avatar 9', 0, 'male'],
      ['man_10_p65ayt.png', 'Man avatar 10', 0, 'male'],
      ['woman_1_gxdigj.png', 'Woman avatar 1', 1, 'female'],
      ['woman_2_ekaxih.png', 'Woman avatar 2', 0, 'female'],
      ['woman_3_gz6rjc.png', 'Woman avatar 3', 0, 'female'],
      ['woman_4_bo1vot.png', 'Woman avatar 4', 0, 'female'],
      ['woman_5_fxl0u9.png', 'Woman avatar 5', 0, 'female'],
      ['woman_6_u46wqf.png', 'Woman avatar 6', 0, 'female'],
      ['woman_7_yegavj.png', 'Woman avatar 7', 0, 'female'],
      ['woman_8_gfpatd.png', 'Woman avatar 8', 0, 'female'],
      ['woman_9_l8m6sb.png', 'Woman avatar 9', 0, 'female'],
      ['woman_10_e3180f.png', 'Woman avatar 10', 0, 'female'],
      ['woman_11.png', 'Woman avatar 11', 0, 'female'],
      ['woman_12.png', 'Woman avatar 12', 0, 'female'],
    ] as const;

    const timestamp = '2025-11-18 13:10:00';

    rows.forEach(([id, altText, isDefault, gender]) => {
      const escapedAltText = altText.replace(/'/g, "''");
      this.addSql(
        `insert into \`avatars\` (\`id\`, \`alt_text\`, \`is_default\`, \`gender\`, \`created_at\`, \`updated_at\`) values ('${id}', '${escapedAltText}', ${isDefault}, '${gender}', '${timestamp}', '${timestamp}');`,
      );
    });
  }

  async down(): Promise<void> {
    const newIds = [
      'man_1_gpzznt.png',
      'man_2_dywpop.png',
      'man_3_vqizi1.png',
      'man_4_ythnaw.png',
      'man_5_au3nha.png',
      'man_6_rz0gf5.png',
      'man_7_vsxzft.png',
      'man_8_q01r5r.png',
      'man_9_gebcgp.png',
      'man_10_p65ayt.png',
      'woman_1_gxdigj.png',
      'woman_2_ekaxih.png',
      'woman_3_gz6rjc.png',
      'woman_4_bo1vot.png',
      'woman_5_fxl0u9.png',
      'woman_6_u46wqf.png',
      'woman_7_yegavj.png',
      'woman_8_gfpatd.png',
      'woman_9_l8m6sb.png',
      'woman_10_e3180f.png',
      'woman_11.png',
      'woman_12.png',
    ];
    this.addSql(
      `delete from \`avatars\` where \`id\` in (${newIds
        .map((id) => `'${id}'`)
        .join(',')});`,
    );

    const previousRows = [
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

    previousRows.forEach(([id, altText, isDefault, gender]) => {
      const escapedAltText = altText.replace(/'/g, "''");
      this.addSql(
        `insert into \`avatars\` (\`id\`, \`alt_text\`, \`is_default\`, \`gender\`, \`created_at\`, \`updated_at\`) values ('${id}', '${escapedAltText}', ${isDefault}, '${gender}', '${timestamp}', '${timestamp}');`,
      );
    });
  }
}
