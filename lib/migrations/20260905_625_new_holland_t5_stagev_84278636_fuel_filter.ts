import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '84278636';
const LEGACY_PARTS = ['47509565', '47509572', '84249719', '84249720', '84249723'] as const;
const FITMENT_URL = 'https://www.agritractors.gr/default.aspx?CategoryId=2368&Id=12&ItemId=4822&LangId=1';
const FITMENT_EXTERNAL_ID = 'agritractors-504063255-84278636-t5-stagev-na-fitment-2026-09';
const SUPERSESSION_URL = 'https://www.messicks.com/parts/new-holland/84278636';
const SUPERSESSION_EXTERNAL_ID = 'messicks-84278636-direct-predecessors-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/amea/en/newhollandag/cn/fuel-filter/p/84278636';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-ag-84278636-fuel-filter-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5 Stage V 84278636 fuel-filter migration dependency.');
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

export const newHollandT5StageV84278636FuelFilterMigration: DbMigration = {
  id: '20260905_625_new_holland_t5_stagev_84278636_fuel_filter',
  description: 'Add exact T5.110-T5.140 AutoCommand/Dynamic Command Stage V fuel filter 84278636 plus verified direct predecessor history',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, CURRENT_PART, CURRENT_PART, 'Fuel Filter'],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    const legacyIds = new Map<string, number>();
    for (const legacyPart of LEGACY_PARTS) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, legacyPart, legacyPart, 'Fuel Filter'],
      );
      legacyIds.set(
        legacyPart,
        await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, legacyPart],
        ),
      );
    }

    let [fitmentRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='AgriTractors' AND domain='agritractors.gr' ORDER BY id LIMIT 1`,
    );
    let fitmentSourceId = fitmentRows[0]?.id ? Number(fitmentRows[0].id) : 0;
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
      'CNH 504063255 WIF sensor application in filter 84278636 with exact T5 Stage V NA/NAFTA fitment',
      {
        role: 'Exact filter/model/transmission/region fitment evidence',
        filterPartNumber: CURRENT_PART,
        sensorPartNumber: '504063255',
        sensorRelationship: 'The source explicitly states that WIF sensor 504063255 is applied in CNH filter 84278636.',
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'The source then lists T5.110, T5.120, T5.130 and T5.140 AutoCommand Tractor Stage V (NA) and Dynamic Command Tractor Stage V (NAFTA), with MY21 catalog families also listed for all four models.',
        confidence: 'secondary/high',
        guardrail: 'Only AutoCommand and Dynamic Command Stage V North American families are inserted here. Although the source contains additional T5 families, Dual Command, ElectroCommand and older emissions generations are deliberately not inferred by this migration.',
      },
    );

    let [messicksRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let messicksSourceId = messicksRows[0]?.id ? Number(messicksRows[0].id) : 0;
    if (!messicksSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      messicksSourceId = Number(result.insertId);
    }

    const supersessionSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      SUPERSESSION_EXTERNAL_ID,
      SUPERSESSION_URL,
      `Messick's ${CURRENT_PART} direct predecessor listing`,
      {
        role: 'Verified direct predecessor/supersession evidence',
        currentPartNumber: CURRENT_PART,
        legacyPartNumbers: [...LEGACY_PARTS],
        replacementStatement: `${CURRENT_PART} replaces ${LEGACY_PARTS.join(', ')}.`,
        serviceNote: 'Messick\'s specifies gasket 82895354 between the filter element and water-in-fuel sensor and notes that CNH-branded 84278636 corresponds to generic CNH part 2859633.',
        guardrail: 'The five dealer-listed predecessor numbers are modeled as direct predecessors of 84278636. No machine fitment is copied to the predecessor parts.',
      },
    );

    for (const legacyPart of LEGACY_PARTS) {
      const legacyPartId = legacyIds.get(legacyPart);
      if (!legacyPartId) throw new Error(`Missing legacy fuel-filter part ${legacyPart}.`);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyPartId, currentPartId, supersessionSourceRecordId],
      );
    }

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
      'MyCNH New Holland Agriculture 84278636 Fuel Filter',
      {
        role: 'Official CNH current-part identity and specifications',
        partNumber: CURRENT_PART,
        name: 'Fuel Filter',
        nominalDimensionsMm: { outsideDiameter: 96, length: 185 },
        thread: 'M16 x 1.5-6H',
        packageWeightKg: 0.724,
        function: 'Protects the injection system from water, soot and other fuel contaminants.',
        fitmentScope: 'Official identity/specification only; exact T5 AutoCommand/Dynamic Command Stage V North American fitment is sourced separately.',
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
        const fitmentNote = `${CURRENT_PART} Fuel Filter with water-in-fuel sensor provision is supported by the exact ${model.model} ${configuration.key} Stage V North American application family. Confirm transmission/build and fuel-filter position before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, currentPartId, machineVersionId, configuration.note],
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
            [machineId, currentPartId, machineVersionId, configuration.note, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
