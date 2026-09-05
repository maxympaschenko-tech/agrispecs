import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '51473453';
const CONFIGURATION = 'Dynamic Command, Stage V, NAFTA, 04/20-present catalog family';
const SOURCE_URL = 'https://www.messicks.com/parts/new-holland/51473453';
const SOURCE_EXTERNAL_ID = 'messicks-t5-110-140-dynamic-stagev-51473453-filter-head-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 Dynamic Command transmission-filter-head migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandT5DynamicTransmissionFilterHeadMigration: DbMigration = {
  id: '20260905_628_new_holland_t5_dynamic_transmission_filter_head',
  description: 'Add exact T5.110-T5.140 Dynamic Command Stage V transmission/hydraulic filter head 51473453 fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug)
       VALUES (?,'Transmission Filter Components','transmission-filter-components')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='transmission-filter-components' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Transmission / Hydraulic Filter Head'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const sourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      SOURCE_EXTERNAL_ID,
      SOURCE_URL,
      `Messick's ${PART_NUMBER} T5 Dynamic Command Stage V filter-head catalog`,
      {
        role: 'Exact model/transmission/region component-fitment evidence',
        partNumber: PART_NUMBER,
        name: 'Head Filter',
        supportedModels: models.map((model) => model.model),
        configuration: CONFIGURATION,
        evidence: 'Messick\'s lists 51473453 for T5.110, T5.120, T5.130 and T5.140 Dynamic Command Tractor Stage V (NAFTA) in 21.103.060 TRANSMISSION, HYDRAULIC PUMP, FILTER. T5.130/T5.140 MY23 additionally list the part in transmission oil-filter head / pressure-switch paths.',
        confidence: 'secondary/high',
        guardrail: 'This is a filter-head assembly/component, not a replaceable filter element. AutoCommand fitment is not inferred.',
      },
    );

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );
      const fitmentNote = `${PART_NUMBER} Transmission / Hydraulic Filter Head is listed for the exact ${model.model} Dynamic Command Stage V NAFTA family. This is a filter-head assembly, not the service filter element; confirm build and transmission configuration before ordering.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, CONFIGURATION],
      );
      if (existing[0]) {
        await connection.query(
          `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
          [fitmentNote, sourceRecordId, Number(existing[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, partId, machineVersionId, CONFIGURATION, fitmentNote, sourceRecordId],
        );
      }
    }
  },
};
