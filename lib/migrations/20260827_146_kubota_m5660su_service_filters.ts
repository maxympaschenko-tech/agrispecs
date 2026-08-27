import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.messicks.com/catalogs/kubota/m5660suh/speed-change-shift-fork-shift-lever/d45000-range-gear-shift-fork-creep-gear-shift-fork';
const SOURCE_EXTERNAL_ID = 'messicks-kubota-m5660suh-frequently-used-service-filters';

const filters = [
  {
    categoryName: 'Engine Air Filters',
    categorySlug: 'engine-air-filters',
    partNumber: 'R1401-42270',
    normalizedPartNumber: 'R140142270',
    name: 'Outer Air Filter Element',
    description: 'Primary outer engine air-cleaner element listed in the Kubota M5660SUH frequently used items catalog.',
  },
  {
    categoryName: 'Engine Air Filters',
    categorySlug: 'engine-air-filters',
    partNumber: 'R2401-42280',
    normalizedPartNumber: 'R240142280',
    name: 'Inner Air Filter Element',
    description: 'Inner safety engine air-filter element listed in the Kubota M5660SUH frequently used items catalog.',
  },
  {
    categoryName: 'Fuel Filters',
    categorySlug: 'fuel-filters',
    partNumber: '1G311-43380',
    normalizedPartNumber: '1G31143380',
    name: 'Fuel Filter Separator Element',
    description: 'Water-separator fuel filter element listed in the Kubota M5660SUH frequently used items catalog.',
  },
  {
    categoryName: 'Fuel Filters',
    categorySlug: 'fuel-filters',
    partNumber: 'HH1J1-43172',
    normalizedPartNumber: 'HH1J143172',
    name: 'Fuel Filter Cartridge',
    description: 'Current fuel filter cartridge listed for the Kubota M5660SUH frequently used items catalog.',
  },
  {
    categoryName: 'Engine Oil Filters',
    categorySlug: 'engine-oil-filters',
    partNumber: 'HH164-32430',
    normalizedPartNumber: 'HH16432430',
    name: 'Engine Oil Filter',
    description: 'Engine oil filter listed directly for Kubota M5660SUH and consistent with the V2403 engine-family reference.',
  },
  {
    categoryName: 'Hydraulic Filters',
    categorySlug: 'hydraulic-filters',
    partNumber: 'HHTA0-37710',
    normalizedPartNumber: 'HHTA037710',
    name: 'Hydraulic Oil Filter',
    description: 'Hydraulic oil filter listed in the Kubota M5660SUH frequently used items catalog.',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M5660SU service-filter migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM5660SUServiceFiltersMigration: DbMigration = {
  id: '20260827_146_kubota_m5660su_service_filters',
  description: 'Add the model-specific Kubota M5660SU service-filter set from dealer parts-catalog frequently used items',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m5660su' LIMIT 1
    `);

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

    const [existingSource] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title)
         VALUES (?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'Kubota M5660SUH parts catalog - frequently used service filters',
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const filter of filters) {
      await connection.query(
        `INSERT INTO part_categories (name,slug)
         VALUES (?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [filter.categoryName, filter.categorySlug],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [filter.categorySlug]);

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
          filter.partNumber,
          filter.normalizedPartNumber,
          filter.name,
          filter.description,
        ],
      );

      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, filter.normalizedPartNumber],
      );

      await connection.query(
        `INSERT INTO machine_parts
          (machine_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
         VALUES (?,?,?,'M5660SUH/M5660SUHD service-filter reference; confirm serial/configuration',?,'high')
         ON DUPLICATE KEY UPDATE
           fitment_note=VALUES(fitment_note),
           configuration_note=VALUES(configuration_note),
           source_record_id=VALUES(source_record_id),
           fitment_confidence=VALUES(fitment_confidence)`,
        [
          machineId,
          partId,
          `Messicks' Kubota M5660SUH catalog lists ${filter.partNumber} among the model's frequently used service items. Confirm exact tractor serial number before ordering.`,
          sourceRecordId,
        ],
      );
    }
  },
};
