import { Migration } from '@mikro-orm/migrations';

export class Migration20251124174500 extends Migration {
  override async up(): Promise<void> {
    const rows = [
      ['woman_13_ifof7f.png', 'Woman avatar 13', 0, 'female'],
      ['woman_14_fieim3.png', 'Woman avatar 14', 0, 'female'],
      ['woman_15_fgdcoz.png', 'Woman avatar 15', 0, 'female'],
      ['woman_16_jonfip.png', 'Woman avatar 16', 0, 'female'],
      ['woman_17_t06rox.png', 'Woman avatar 17', 0, 'female'],
      ['woman_18_lezgcx.png', 'Woman avatar 18', 0, 'female'],
      ['woman_19_mbgirg.png', 'Woman avatar 19', 0, 'female'],
      ['man_11_vlvvlk.png', 'Man avatar 11', 0, 'male'],
      ['man_12_sgru2n.png', 'Man avatar 12', 0, 'male'],
      ['man_13_hr5z0q.png', 'Man avatar 13', 0, 'male'],
      ['man_14_x8lgpf.png', 'Man avatar 14', 0, 'male'],
      ['man_15_xjnogu.png', 'Man avatar 15', 0, 'male'],
      ['man_16_qlk739.png', 'Man avatar 16', 0, 'male'],
      ['man_17_j1okqc.png', 'Man avatar 17', 0, 'male'],
    ] as const;

    const timestamp = '2025-11-24 17:45:00';

    rows.forEach(([id, altText, isDefault, gender]) => {
      const escapedAltText = altText.replace(/'/g, "''");
      this.addSql(
        `insert into \`avatars\` (\`id\`, \`alt_text\`, \`is_default\`, \`gender\`, \`created_at\`, \`updated_at\`) values ('${id}', '${escapedAltText}', ${isDefault}, '${gender}', '${timestamp}', '${timestamp}') on duplicate key update \`alt_text\` = values(\`alt_text\`), \`is_default\` = values(\`is_default\`), \`gender\` = values(\`gender\`);`,
      );
    });
  }

  override async down(): Promise<void> {
    const ids = [
      'woman_13_ifof7f.png',
      'woman_14_fieim3.png',
      'woman_15_fgdcoz.png',
      'woman_16_jonfip.png',
      'woman_17_t06rox.png',
      'woman_18_lezgcx.png',
      'woman_19_mbgirg.png',
      'man_11_vlvvlk.png',
      'man_12_sgru2n.png',
      'man_13_hr5z0q.png',
      'man_14_x8lgpf.png',
      'man_15_xjnogu.png',
      'man_16_qlk739.png',
      'man_17_j1okqc.png',
    ];

    this.addSql(
      `delete from \`avatars\` where \`id\` in (${ids.map((id) => `'${id}'`).join(',')});`,
    );
  }
}
