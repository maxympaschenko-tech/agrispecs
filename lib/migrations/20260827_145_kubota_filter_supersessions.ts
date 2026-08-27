import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Replacement = {
  oldNumber: string;
  oldNormalized: string;
  newNumber: string;
  newNormalized: string;
  categorySlug: string;
  oldName: string;
  url: string;
  externalId: string;
  title: string;
};

const replacements: Replacement[] = [
  {
    oldNumber: '3F750-11220',
    oldNormalized: '3F75011220',
    newNumber: '59800-26110',
    newNormalized: '5980026110',
    categorySlug: 'engine-air-filters',
    oldName: 'Outer Air Filter Element',
    url: 'https://www.messicks.com/parts/kubota/3F750-11220',
    externalId: 'messicks-kubota-3f750-11220-replaced-by-59800-26110',
    title: 'Kubota 3F750-11220 - replaced by 59800-26110',
  },
  {
    oldNumber: 'TA040-37710',
    oldNormalized: 'TA04037710',
    newNumber: 'T0070-37710',
    newNormalized: 'T007037710',
    categorySlug: 'hydraulic-filters',
    oldName: 'Hydraulic Oil Filter',
    url: 'https://www.messicks.com/parts/kubota/T0070-37710',
    externalId: 'messicks-kubota-ta040-37710-replaced-by-t0070-37710',
    title: 'Kubota TA040-37710 - replaced by T0070-37710',
  },
  {
    oldNumber: 'T0070-37710',
    oldNormalized: 'T007037710',
    newNumber: 'HHTA0-37710',
    newNormalized: 'HHTA037710',
    categorySlug: 'hydraulic-filters',
    oldName: 'Hydraulic Oil Filter',
    url: 'https://www.messicks.com/parts/kubota/T0070-37710',
    externalId: 'messicks-kubota-t0070-37710-replaced-by-hhta0-37710',
    title: 'Kubota T0070-37710 - replaced by HHTA0-37710',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota filter supersession migration dependency.');
  return Number(rows[0].id);
}

export const kubotaFilterSupersessionsMigration: DbMigration = {
  id: '20260827_145_kubota_filter_supersessions',
  description: 'Add Kubota legacy-to-current air and hydraulic filter replacement chains from current dealer catalog records',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

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

    // First create every legacy node so multi-step replacement chains are order-independent.
    for (const item of replacements) {
      const categoryId = await selectId(
        connection,
        `SELECT id FROM part_categories WHERE slug=? LIMIT 1`,
        [item.categorySlug],
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
          item.oldNumber,
          item.oldNormalized,
          item.oldName,
          `Legacy Kubota part number. Dealer catalog lists ${item.newNumber} as the replacement in the supersession chain.`,
        ],
      );
    }

    // Then connect the complete replacement graph.
    for (const item of replacements) {
      const oldPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, item.oldNormalized],
      );
      const newPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, item.newNormalized],
      );

      const [existingSource] = await connection.query<IdRow[]>(
        `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
        [item.externalId],
      );
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId, item.url, item.externalId, item.title],
        );
        sourceRecordId = Number(result.insertId);
      }

      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId, newPartId, sourceRecordId],
      );
    }
  },
};
