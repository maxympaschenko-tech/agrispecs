import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Rule = [string, string, string | null, string | null, string | null, string];

const PRICEBOOK_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/TRACTORS_1000%27s-4000%27s_WITH%20ALDI_01NOV2025.pdf';
const PRICEBOOK_ID = 'jd-compact-aldi-pricebook-2025-11-05';
const GUIDE_3038_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3038e-tractor-my22-ww-edition.pdf';
const GUIDE_3038_ID = 'jd-rpg-3038e-my22-np100000-worldwide-2024-03';
const GUIDE_3032_ID = 'jd-rpg-3032e-my22-np100000-worldwide-2024-03';

const rules: Rule[] = [
  ['3032e','LVA21128',null,null,'610000',PRICEBOOK_ID],
  ['3032e','LVA21037',null,'610001',null,PRICEBOOK_ID],
  ['3032e','LVA21037','GH','100001',null,PRICEBOOK_ID],
  ['3032e','TA26997','NP','100000',null,GUIDE_3032_ID],
  ['3038e','LVA21128',null,null,'610000',PRICEBOOK_ID],
  ['3038e','LVA21037',null,'610001',null,PRICEBOOK_ID],
  ['3038e','LVA21037','GH','100001',null,PRICEBOOK_ID],
  ['3038e','TA26997','NP','100000',null,GUIDE_3038_ID],
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 3E Filter Pak generation dependency.');
  return Number(rows[0].id);
}

export const johnDeere3EFilterPakGenerationsMigration: DbMigration = {
  id: '20260827_111_3e_filter_pak_generations',
  description: 'Add source-backed LVA21128, LVA21037 and TA26997 serial generations for John Deere 3032E and 3038E',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Maintenance Kits','maintenance-kits') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='maintenance-kits' LIMIT 1`);

    for (const [number,name] of [['LVA21128','Filter Pak'],['LVA21037','Filter Pak'],['TA26997','Filter Pak']] as const) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,number,name],
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    async function sourceRecord(externalId: string, url: string, title: string, publishedDate: string | null) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
      if (existing[0]) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,url,externalId,title,publishedDate],
      );
      return Number(result.insertId);
    }

    const sourceIds = new Map<string,number>();
    sourceIds.set(PRICEBOOK_ID, await sourceRecord(PRICEBOOK_ID,PRICEBOOK_URL,'John Deere compact tractors with ALDI North America price book - Filter Pak compatibility','2025-11-05'));
    sourceIds.set(GUIDE_3038_ID, await sourceRecord(GUIDE_3038_ID,GUIDE_3038_URL,'John Deere 3038E MY22- NP100000- Replacement Parts Guide - Worldwide Edition','2024-03-01'));
    sourceIds.set(GUIDE_3032_ID, await selectId(connection, `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [GUIDE_3032_ID]));

    const machineIds = new Map<string,number>();
    for (const slug of ['3032e','3038e']) {
      machineIds.set(slug,await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [slug]));
    }

    const partIds = new Map<string,number>();
    for (const number of ['LVA21128','LVA21037','TA26997']) {
      partIds.set(number,await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,number]));
    }

    for (const pair of Array.from(new Set(rules.map((rule) => `${rule[0]}|${rule[1]}`)))) {
      const [machine,part] = pair.split('|');
      await connection.query(
        `DELETE FROM machine_parts WHERE machine_id=? AND part_id=?
         AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL`,
        [machineIds.get(machine),partIds.get(part)],
      );
    }

    for (const [machine,part,prefix,from,to,sourceKey] of rules) {
      const machineId = machineIds.get(machine);
      const partId = partIds.get(part);
      const sourceRecordId = sourceIds.get(sourceKey);
      if (!machineId || !partId || !sourceRecordId) throw new Error('Missing 3E generation rule dependency.');
      const label = `${machine.toUpperCase()} ${part}${prefix ? ` ${prefix}` : ''}${from ? ` from ${from}` : ''}${to ? ` through ${to}` : ''}.`;

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=?
         AND COALESCE(serial_prefix,'')=COALESCE(?,'')
         AND COALESCE(serial_from,'')=COALESCE(?,'')
         AND COALESCE(serial_to,'')=COALESCE(?,'') LIMIT 1`,
        [machineId,partId,prefix,from,to],
      );
      if (existing[0]) {
        await connection.query(`UPDATE machine_parts SET fitment_note=?,source_record_id=? WHERE id=?`, [label,sourceRecordId,Number(existing[0].id)]);
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,serial_prefix,serial_from,serial_to,source_record_id)
           VALUES (?,?,?,?,?,?,?)`, [machineId,partId,label,prefix,from,to,sourceRecordId]);
      }
    }
  },
};
