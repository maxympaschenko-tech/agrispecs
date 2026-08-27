import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const machineSlugs = ['6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150'] as const;

const parts = [
  {
    number: 'RE504836', name: 'Engine Oil Filter', category: 'engine-oil-filters',
    url: 'https://shop.deere.com/uk/product/RE504836%3A-Engine-Oil-Filter/p/RE504836',
    externalId: 'jd-shop-re504836-6m-fitment-2026-08',
    title: 'John Deere RE504836 Engine Oil Filter - compatible equipment',
  },
  {
    number: 'DZ115390', name: 'Final Fuel Filter', category: 'fuel-filters',
    url: 'https://shop.deere.com/us/product/DZ115390%3A-Final-Fuel-Filter/p/DZ115390',
    externalId: 'jd-shop-dz115390-6m-fitment-2026-08',
    title: 'John Deere DZ115390 Final Fuel Filter - compatible equipment',
  },
  {
    number: 'AL206482', name: 'Transmission Oil Filter Element', category: 'hydraulic-filters',
    url: 'https://shop.deere.com/uk/product/AL206482%3A-Transmission-Oil-Filter-Element/p/AL206482',
    externalId: 'jd-shop-al206482-6m-fitment-2026-08',
    title: 'John Deere AL206482 Transmission Oil Filter Element - compatible equipment',
  },
  {
    number: 'AL232893', name: 'Hydraulic Oil Filter Assembly', category: 'hydraulic-filters',
    url: 'https://shop.deere.com/uk/product/AL232893%3A-Hydraulic-Pump-Hydraulic-Oil-Filter/p/AL232893',
    externalId: 'jd-shop-al232893-6m-fitment-2026-08',
    title: 'John Deere AL232893 Hydraulic Oil Filter Assembly - compatible equipment',
  },
  {
    number: 'AL233627', name: 'Activated Carbon Air Filter', category: 'cab-air-filters',
    url: 'https://shop.deere.com/uk/product/AL233627%3A-Activated-Carbon-Air-Filter/p/AL233627',
    externalId: 'jd-shop-al233627-6m-fitment-2026-08',
    title: 'John Deere AL233627 Activated Carbon Air Filter - compatible equipment',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 6M verified fitment migration.');
  return Number(rows[0].id);
}

export const johnDeere6MVerifiedFitmentMigration: DbMigration = {
  id: '20260827_104_6m_verified_fitment',
  description: 'Add current Shop.Deere verified OEM part fitment for priority John Deere 6M tractors without inferring service intervals',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    for (const part of parts) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [part.category]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number,part.name],
      );
      const partId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,part.number]);

      const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [part.externalId]);
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId,part.url,part.externalId,part.title],
        );
        sourceRecordId = Number(result.insertId);
      }

      for (const slug of machineSlugs) {
        const machineId = await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [slug]);
        const note = `${slug.toUpperCase()} compatible equipment listing confirmed by current John Deere Shop fitment data; service interval not inferred from this source.`;
        const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,partId,note]);
        if (!existing[0]) {
          await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,partId,note,sourceRecordId]);
        }
      }
    }
  },
};
