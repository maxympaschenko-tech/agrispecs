import type { DbMigration } from '@/lib/db-migration-types';

export const ta25767SourceUrlCorrectionMigration: DbMigration = {
  id: '20260827_114_ta25767_source_url_correction',
  description: 'Normalize the TA25767 official Shop.Deere.com source URL to the US product page',
  async apply(connection) {
    await connection.query(
      `UPDATE source_records
       SET url=?
       WHERE external_id='jd-shop-ta25767-compatible-equipment-2026-08'`,
      ['https://shop.deere.com/us/product/TA25767%3A-Filter-Pak/p/TA25767?equiptype=2032R'],
    );
  },
};
