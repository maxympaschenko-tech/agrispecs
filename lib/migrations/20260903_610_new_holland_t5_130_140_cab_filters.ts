import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartNumber = '87726699' | '92264209';

const CURRENT_VERSION = 'united-states-current-2026-08';

const parts: Record<PartNumber, { name: string; url: string; externalId: string; roofScope: string }> = {
  '87726699': {
    name: 'Cab Air Filter',
    url: 'https://www.messicks.com/parts/new-holland/87726699',
    externalId: 'messicks-t5-130-140-stagev-87726699-cab-filter-2026-09',
    roofScope: 'cab; high-profile or low-profile roof where listed by the exact catalog',
  },
  '92264209': {
    name: 'Cab Air Filter',
    url: 'https://www.messicks.com/parts/new-holland/92264209',
    externalId: 'messicks-t5-130-140-stagev-92264209-cab-filter-2026-09',
    roofScope: 'cab; low-profile roof only',
  },
};

const models = [
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', catalog: 'Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', catalog: 'Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 cab-filter migration dependency.');
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

export const newHollandT5130140CabFiltersMigration: DbMigration = {
  id: '20260903_610_new_holland_t5_130_140_cab_filters',
  description: 'Add exact T5.130/T5.140 Stage V AutoCommand/Dynamic Command cab-filter fitment with roof-profile caveats',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const cabCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='cab-filters' LIMIT 1`);

    const partIds = new Map<PartNumber, number>();
    for (const [partNumber, part] of Object.entries(parts) as Array<[PartNumber, (typeof parts)[PartNumber]]>) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, cabCategoryId, partNumber, partNumber, part.name],
      );
      partIds.set(
        partNumber,
        await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, partNumber],
        ),
      );
    }

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

    const sourceRecordIds = new Map<PartNumber, number>();
    for (const [partNumber, part] of Object.entries(parts) as Array<[PartNumber, (typeof parts)[PartNumber]]>) {
      sourceRecordIds.set(
        partNumber,
        await ensureSourceRecord(
          connection,
          sourceId,
          part.externalId,
          part.url,
          `Messick's New Holland ${partNumber} T5.130/T5.140 Stage V cab-filter catalog`,
          {
            role: 'Exact model/transmission/cab-roof fitment evidence',
            partNumber,
            name: part.name,
            supportedModels: models.map((model) => model.model),
            supportedConfigurations: configurations.map((configuration) => `${configuration.key}, ${configuration.catalog}`),
            roofScope: part.roofScope,
            evidence: partNumber === '87726699'
              ? 'Messick\'s lists 87726699 in T5.130 and T5.140 Stage V AutoCommand/Dynamic Command maintenance and cab-air-filter paths, including high- and low-profile roof applications where the model catalog lists them.'
              : 'Messick\'s lists 92264209 in T5.130 and T5.140 Stage V AutoCommand/Dynamic Command maintenance and low-profile-roof cab-air-filter paths.',
            confidence: 'secondary/high',
            guardrail: partNumber === '92264209'
              ? 'Low-profile-roof cab application only. Do not infer high-profile-roof or ROPS fitment.'
              : 'Cab application only; roof-profile availability must follow the exact machine configuration. Do not infer ROPS fitment.',
          },
        ),
      );
    }

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

      for (const configuration of configurations) {
        for (const partNumber of Object.keys(parts) as PartNumber[]) {
          const partId = partIds.get(partNumber);
          const sourceRecordId = sourceRecordIds.get(partNumber);
          if (!partId || !sourceRecordId) throw new Error(`Missing ${partNumber} cab-filter dependency.`);
          const roof = partNumber === '92264209' ? 'low-profile roof' : 'high- or low-profile roof where cataloged';
          const configurationNote = `${configuration.key}, ${configuration.catalog}; cab, ${roof}`;
          const fitmentNote = `${partNumber} Cab Air Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American cab catalog. Applies to ${roof}; confirm cab roof/HVAC configuration before ordering.`;
          const [existing] = await connection.query<IdRow[]>(
            `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
            [machineId, partId, machineVersionId, configurationNote],
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
              [machineId, partId, machineVersionId, configurationNote, fitmentNote, sourceRecordId],
            );
          }
        }
      }
    }
  },
};
