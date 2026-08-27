import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const OLD_NORMALIZED = '1J80043170';
const MID_NUMBER = '1J800-43172';
const MID_NORMALIZED = '1J80043172';
const CURRENT_NORMALIZED = 'HH1J143172';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota fuel-filter supersession dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0], sourceId: number,
  externalId: string, url: string, title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
  );
  return Number(result.insertId);
}

export const kubotaFuelFilterFullSupersessionChainMigration: DbMigration = {
  id: '20260827_158_kubota_fuel_filter_full_supersession_chain',
  description: 'Normalize Kubota fuel-filter replacement graph to 1J800-43170 -> 1J800-43172 -> HH1J1-43172',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);
    const oldPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId,OLD_NORMALIZED],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId,CURRENT_NORMALIZED],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'partial')
       ON DUPLICATE KEY UPDATE
         category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),
         data_status=IF(data_status='verified','verified','partial')`,
      [
        manufacturerId,categoryId,MID_NUMBER,MID_NORMALIZED,'Legacy Fuel Filter Cartridge',
        'Intermediate Kubota fuel-filter number. Dealer replacement data shows 1J800-43170 was superseded by 1J800-43172, which is now superseded by HH1J1-43172.',
      ],
    );
    const midPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId,MID_NORMALIZED],
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const oldToMidSourceId = await ensureSourceRecord(
      connection,sourceId,
      'messicks-kubota-1j800-43170-to-1j800-43172',
      'https://www.messicks.com/parts/kubota/1j800-43172',
      'Kubota 1J800-43172 - replaces 1J800-43170 and is replaced by HH1J1-43172',
    );
    const midToCurrentSourceId = await ensureSourceRecord(
      connection,sourceId,
      'messicks-kubota-1j800-43172-to-hh1j1-43172',
      'https://www.messicks.com/parts/kubota/1j800-43172',
      'Kubota 1J800-43172 - replaced by HH1J1-43172',
    );

    // Remove the earlier shortcut edge so the replacement chain has one deterministic path.
    await connection.query(
      `DELETE FROM part_cross_references
       WHERE part_id=? AND cross_part_id=? AND relation_type='replaces'`,
      [oldPartId,currentPartId],
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPartId,midPartId,oldToMidSourceId],
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [midPartId,currentPartId,midToCurrentSourceId],
    );
  },
};
