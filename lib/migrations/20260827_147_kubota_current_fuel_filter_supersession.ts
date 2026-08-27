import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_PART_NUMBER = 'HH1J1-43172';
const CURRENT_NORMALIZED = 'HH1J143172';
const LEGACY_PART_NUMBER = '1J800-43170';
const LEGACY_NORMALIZED = '1J80043170';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota current fuel-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  url: string,
  externalId: string,
  title: string,
) {
  const [existing] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (existing[0]) return Number(existing[0].id);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId, url, externalId, title],
  );
  return Number(result.insertId);
}

export const kubotaCurrentFuelFilterSupersessionMigration: DbMigration = {
  id: '20260827_147_kubota_current_fuel_filter_supersession',
  description: 'Replace legacy Kubota M60 fuel-filter fitment 1J800-43170 with current HH1J1-43172 and retain the legacy replacement lookup',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

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

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      'https://www.messicks.com/parts/kubota/hh1j1-43172',
      'messicks-kubota-hh1j1-43172-current-fuel-filter',
      'Kubota HH1J1-43172 Fuel Filter Cartridge - current model fitment catalog',
    );
    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      'https://www.messicks.com/parts/kubota/1j800-43170',
      'messicks-kubota-1j800-43170-replaced-by-hh1j1-43172',
      'Kubota 1J800-43170 - replaced by HH1J1-43172',
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'partial')
       ON DUPLICATE KEY UPDATE
         category_id=VALUES(category_id),
         part_number=VALUES(part_number),
         name=VALUES(name),
         description=VALUES(description),
         data_status=IF(data_status='verified','verified','partial')`,
      [
        manufacturerId,
        categoryId,
        CURRENT_PART_NUMBER,
        CURRENT_NORMALIZED,
        'Fuel Filter Cartridge',
        'Current Kubota fuel filter cartridge replacing legacy 1J800-43170; model fitment is retained with source-backed M60 references.',
      ],
    );

    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_NORMALIZED],
    );
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_NORMALIZED],
    );

    await connection.query(
      `UPDATE parts
       SET name='Legacy Fuel Filter Cartridge',
           description=?,
           data_status=IF(data_status='verified','verified','partial')
       WHERE id=?`,
      [
        `Legacy Kubota fuel filter ${LEGACY_PART_NUMBER}. Dealer catalog lists ${CURRENT_PART_NUMBER} as the current replacement.`,
        legacyPartId,
      ],
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, replacementSourceRecordId],
    );

    for (const modelSlug of ['m5660su', 'm6060', 'm7060']) {
      const machineId = await selectId(connection, `
        SELECT m.id FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
      `, [modelSlug]);

      await connection.query(
        `INSERT INTO machine_parts
          (machine_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
         VALUES (?,?,?,'Current Kubota fuel-filter number; confirm tractor serial/configuration',?,'high')
         ON DUPLICATE KEY UPDATE
           fitment_note=VALUES(fitment_note),
           configuration_note=VALUES(configuration_note),
           source_record_id=VALUES(source_record_id),
           fitment_confidence=VALUES(fitment_confidence)`,
        [
          machineId,
          currentPartId,
          `Messicks lists ${CURRENT_PART_NUMBER} as the current Kubota fuel-filter cartridge and includes this M60 model family in the fitment catalog. Confirm exact serial number before ordering.`,
          fitmentSourceRecordId,
        ],
      );
    }

    // Keep the legacy part searchable through its replacement page, but do not show it as a current model service item.
    await connection.query(`
      DELETE mp FROM machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota'
        AND m.slug IN ('m5660su','m6060','m7060')
        AND mp.part_id=?
    `, [legacyPartId]);
  },
};
