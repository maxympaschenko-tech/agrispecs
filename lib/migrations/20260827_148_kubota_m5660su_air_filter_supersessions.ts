import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Replacement = {
  oldNumber: string;
  oldNormalized: string;
  newNumber: string;
  newNormalized: string;
  url: string;
  externalId: string;
  title: string;
};

const replacements: Replacement[] = [
  {
    oldNumber: 'TC630-93230',
    oldNormalized: 'TC63093230',
    newNumber: 'R1401-42270',
    newNormalized: 'R140142270',
    url: 'https://www.messicks.com/parts/kubota/r1401-42270',
    externalId: 'messicks-kubota-tc630-93230-replaced-by-r1401-42270',
    title: 'Kubota TC630-93230 - replaced by R1401-42270',
  },
  {
    oldNumber: '1J461-11220',
    oldNormalized: '1J46111220',
    newNumber: 'R2401-42280',
    newNormalized: 'R240142280',
    url: 'https://www.messicks.com/parts/kubota/r2401-42280',
    externalId: 'messicks-kubota-1j461-11220-replaced-by-r2401-42280',
    title: 'Kubota 1J461-11220 - replaced by R2401-42280',
  },
  {
    oldNumber: 'TC630-93220',
    oldNormalized: 'TC63093220',
    newNumber: 'R2401-42280',
    newNormalized: 'R240142280',
    url: 'https://www.messicks.com/parts/kubota/r2401-42280',
    externalId: 'messicks-kubota-tc630-93220-replaced-by-r2401-42280',
    title: 'Kubota TC630-93220 - replaced by R2401-42280',
  },
  {
    oldNumber: 'TC630-93222',
    oldNormalized: 'TC63093222',
    newNumber: 'R2401-42280',
    newNormalized: 'R240142280',
    url: 'https://www.messicks.com/parts/kubota/r2401-42280',
    externalId: 'messicks-kubota-tc630-93222-replaced-by-r2401-42280',
    title: 'Kubota TC630-93222 - replaced by R2401-42280',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M5660SU air-filter supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaM5660SUAirFilterSupersessionsMigration: DbMigration = {
  id: '20260827_148_kubota_m5660su_air_filter_supersessions',
  description: 'Add Kubota legacy outer and inner air-filter replacement numbers leading to current M5660SU service filters',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-air-filters' LIMIT 1`);

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

    for (const item of replacements) {
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
          'Legacy Engine Air Filter',
          `Legacy Kubota air-filter number. Dealer catalog lists ${item.newNumber} as the current replacement.`,
        ],
      );

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

      const [existingRecord] = await connection.query<IdRow[]>(
        `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
        [item.externalId],
      );
      let sourceRecordId = existingRecord[0]?.id ? Number(existingRecord[0].id) : 0;
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
