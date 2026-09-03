import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '84228488';
const FITMENT_URL = 'https://www.agritractors.gr/default.aspx?CategoryId=2375&Id=12&Index=0&ItemId=4603&LangId=1';
const FITMENT_EXTERNAL_ID = 'agritractors-t5-110-140-stagev-na-84228488-engine-oil-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/ca/en/caseih/category/filters/oil-filters/engine-oil-filter/p/84228488';
const OFFICIAL_EXTERNAL_ID = 'mycnh-84228488-engine-oil-filter-identity-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 Stage V engine-oil-filter migration dependency.');
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

export const newHollandT5StageVEngineOilFilterMigration: DbMigration = {
  id: '20260903_620_new_holland_t5_stagev_engine_oil_filter',
  description: 'Add exact T5.110-T5.140 AutoCommand/Dynamic Command Stage V engine-oil filter 84228488 fitment with OEM identity provenance',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Engine Oil Filter'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
    );

    let [fitmentSourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='AgriTractors' AND domain='agritractors.gr' ORDER BY id LIMIT 1`,
    );
    let fitmentSourceId = fitmentSourceRows[0]?.id ? Number(fitmentSourceRows[0].id) : 0;
    if (!fitmentSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('AgriTractors','agritractors.gr','supplier','secondary')`,
      );
      fitmentSourceId = Number(result.insertId);
    }

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      fitmentSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      'CNH 84228488 exact T5 Stage V North America application listing',
      {
        role: 'Exact model/transmission/region fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'The CNH application listing explicitly names T5.110, T5.120, T5.130 and T5.140 AutoCommand Stage V (NA) and Dynamic Command Stage V (NAFTA), including MY21 entries, for engine-oil filter 84228488.',
        corroboration: 'New Holland Rochester independently lists 84228488 as an engine-oil filter used on T5.110 from 06/19, T5.120/T5.130/T5.140 from 06/19, while other CNH application listings show the same Stage V AutoCommand/Dynamic Command family.',
        confidence: 'secondary/high',
        guardrail: 'ElectroCommand is intentionally excluded because the exact T5.110/T5.120 ElectroCommand Stage V North America catalog uses engine-oil filter 48138563 in migration 607. No predecessor part numbers are given machine fitment here.',
      },
    );

    let [officialRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='MyCNH Store' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    let officialSourceId = officialRows[0]?.id ? Number(officialRows[0].id) : 0;
    if (!officialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('MyCNH Store','mycnhstore.com','manufacturer','official')`,
      );
      officialSourceId = Number(result.insertId);
    }

    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'MyCNH 84228488 Engine Oil Filter',
      {
        role: 'Official CNH part identity and specifications',
        partNumber: PART_NUMBER,
        name: 'Engine Oil Filter',
        specifications: { outsideDiameterMm: 96, lengthMm: 177, thread: 'M27 x 2-6H' },
        description: 'Official MyCNH identifies 84228488 as an engine oil filter with advanced synthetic media.',
        fitmentScope: 'Identity/specification only; exact New Holland T5 North American transmission fitment is sourced separately.',
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

      for (const configuration of configurations) {
        const fitmentNote = `${PART_NUMBER} Engine Oil Filter is listed for the exact ${model.model} ${configuration.key} Stage V North American tractor family. Confirm transmission/build configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configuration.note],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, fitmentSourceRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, configuration.note, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
