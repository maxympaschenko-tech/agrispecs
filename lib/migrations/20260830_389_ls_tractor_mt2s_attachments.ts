import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT2S_Update_V8.pdf';
const LOADERS_URL = 'https://lstractorusa.com/front-end-loaders/';
const BACKHOES_URL = 'https://lstractorusa.com/backhoes/';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT2S attachment migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(inserted.insertId);
}

export const lsTractorMt2sAttachmentsMigration: DbMigration = {
  id: '20260830_389_ls_tractor_mt2s_attachments',
  description: 'Add verified current MT225S loaders LL2300/LL2001 and conservative LB1300 backhoe fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='mt225s' LIMIT 1`, [manufacturerId]);

    const loaderSourceId = await ensureSource(c, sourceId, 'ls-tractor-mt2s-loaders-current-us-2026-08', LOADERS_URL, 'LS Tractor MT225S current loader specifications and fitment', {
      market: 'United States', captured: '2026-08-30', brochure: BROCHURE_URL,
      fitment: { LL2300: ['MT225S'], LL2001: ['MT225S'] },
      sourceConflict: 'For LL2001, the current 2025/10 MT2S brochure publishes 1,127 lb lift capacity at pivot pin, while the current central loader catalog publishes 1,067 lb at pivot pin / maximum height. Both current official values are retained with their labels.',
      sourcePolicy: 'Current model page lists LL2300 and LL2001; current central loader catalog also lists both as MT225S-compatible.'
    });
    const backhoeSourceId = await ensureSource(c, sourceId, 'ls-tractor-mt2s-backhoe-current-us-2026-08', BACKHOES_URL, 'LS Tractor MT225S conservative current backhoe fitment', {
      market: 'United States', captured: '2026-08-30', brochure: BROCHURE_URL,
      verified: ['LB1300'],
      deferred: ['LB2001 appears on the live MT225S model page but not in the current central backhoe catalog.', 'LB2100 appears in the current 2025/10 MT2S brochure, but the current central backhoe catalog assigns LB2100/LB2104/LB2105/LB2106 to MT335/MT340 instead of MT225S.'],
      sourceConflict: 'Even for LB1300, current brochure and central catalog differ on swing arc and stabilizer spread. Both official descriptions are preserved in configuration text rather than silently reconciled.'
    });

    const loaders = [
      {
        slug: 'll2300', model: 'LL2300',
        lift: '1,067 lb at pivot pin (current MT2S brochure); central loader catalog also publishes 1,067 lb at pivot pin / maximum height',
        height: '84.4 in maximum lift height',
        config: 'Current LS Tractor USA MT225S front loader. 54.3 in bucket; 84.4 in maximum lift height; 59.1 in clearance with attachment dumped; 17.9 in reach at maximum height; 55° maximum dump; 40° maximum rollback; 4.5 in digging depth; 46 in carry height; 2,290 lb breakout force at pivot pin; approximately 708 lb without bucket.'
      },
      {
        slug: 'll2001', model: 'LL2001',
        lift: '1,127 lb at pivot pin (current MT2S brochure); 1,067 lb at pivot pin / maximum height (current central loader catalog)',
        height: '84.4 in maximum lift height',
        config: 'Current LS Tractor USA MT225S alternate front loader. 54 in bucket; 84.4 in maximum lift height; 59.1 in clearance with attachment dumped; 17.8 in reach at maximum height; 55° maximum dump; 27° maximum rollback; 4.5 in digging depth; 49.5 in carry height; current MT2S brochure publishes 1,744 lb breakout force at pivot pin and approximately 742 lb without bucket. Current central loader catalog publishes a different lift-capacity label/value, retained separately.'
      }
    ];
    for (const loader of loaders) {
      await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'front-loader',?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`, [manufacturerId, loader.model, loader.slug, loader.lift, loader.height, loader.config]);
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);
      await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, attachmentId, `${loader.model} is confirmed for MT225S by the current MT225S page, current MT2S brochure and current central front-loader catalog.`, loaderSourceId]);
    }

    await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'backhoe','LB1300','lb1300',NULL,NULL,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`, [manufacturerId,
      'Current LS Tractor USA MT225S backhoe. Both current sources publish 84.9 in digging depth, 113.7 in reach from swing pivot, 64.7 in loading height, 73.4 in transport height, 177° bucket rotation and 3,013 lb bucket digging force. The current 2025/10 MT2S brochure publishes 180° swing arc, 82.2 in stabilizer spread down and 65.4 in up; the current central backhoe catalog publishes 170° swing arc, 57.3 in down and 65.5 in up. These official differences are retained rather than averaged.'
    ]);
    const backhoeId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='lb1300' LIMIT 1`, [manufacturerId]);
    await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, backhoeId, 'LB1300 is the only MT225S backhoe fitment confirmed simultaneously by the current MT225S model page and current central LS Tractor backhoe catalog; conflicting LB2001/LB2100 references are intentionally deferred.', backhoeSourceId]);
  },
};
