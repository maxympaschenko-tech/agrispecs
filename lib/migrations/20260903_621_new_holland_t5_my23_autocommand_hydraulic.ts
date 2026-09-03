import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '90433749';
const CONFIGURATION = 'AutoCommand, Stage V, North America, MY23 (02/23) catalog family';
const FITMENT_URL = 'https://sklepfarmera.pl/filtr-hydrauliki-new-holland-90433749.html';
const FITMENT_EXTERNAL_ID = 'sklep-farmera-t5-110-140-my23-autocommand-90433749-hydraulic-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/gb/en/caseih/category/filters/hydraulic-filters/hydraulic-oil-filter/p/90433749';
const OFFICIAL_EXTERNAL_ID = 'mycnh-90433749-hydraulic-oil-filter-identity-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 MY23 AutoCommand hydraulic-filter migration dependency.');
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

export const newHollandT5My23AutoCommandHydraulicMigration: DbMigration = {
  id: '20260903_621_new_holland_t5_my23_autocommand_hydraulic',
  description: 'Add T5.110-T5.140 AutoCommand Stage V MY23 hydraulic filter 90433749 without inferring Dynamic Command fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Hydraulic Oil Filter'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
    );

    let [fitmentSourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Sklep Farmera' AND domain='sklepfarmera.pl' ORDER BY id LIMIT 1`,
    );
    let fitmentSourceId = fitmentSourceRows[0]?.id ? Number(fitmentSourceRows[0].id) : 0;
    if (!fitmentSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Sklep Farmera','sklepfarmera.pl','supplier','secondary')`,
      );
      fitmentSourceId = Number(result.insertId);
    }

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      fitmentSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      'CNH 90433749 T5 AutoCommand Stage V MY23 application listing',
      {
        role: 'Exact model/transmission/model-year fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        configuration: CONFIGURATION,
        evidence: 'The application listing explicitly identifies New Holland T5 AutoCommand Stage V MY23 and names T5.110, T5.120, T5.130 and T5.140 for hydraulic filter 90433749.',
        corroboration: 'Independent filter catalogs list 90433749 for all four T5 AutoCommand models; AKVA additionally exposes T5.110 AutoCommand Stage V NAFTA MY23 in its CNH-derived fitment data.',
        confidence: 'secondary/high',
        guardrail: 'Dynamic Command is not inserted by this migration. Although partial Dynamic Command MY23 evidence exists, complete exact model-by-model corroboration was not established for the entire T5.110-T5.140 set. This filter is also not treated as a replacement for 91843297; both can represent different hydraulic service positions/configurations.',
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
      'MyCNH 90433749 Hydraulic Oil Filter',
      {
        role: 'Official CNH part identity and specifications',
        partNumber: PART_NUMBER,
        name: 'Hydraulic Oil Filter',
        specifications: { outsideDiameterMm: 106, lengthMm: 267 },
        description: 'Official MyCNH identifies 90433749 as a hydraulic oil filter that traps particles harmful to pumps, control valves, cylinders and hydraulic motors.',
        fitmentScope: 'Identity/specification only; exact T5 MY23 AutoCommand fitment is sourced separately.',
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
      const fitmentNote = `${PART_NUMBER} Hydraulic Oil Filter is listed for the exact ${model.model} AutoCommand Stage V MY23 family. This is an MY23/configuration-specific hydraulic filter record and does not replace other hydraulic-filter positions; confirm build and service position before ordering.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, CONFIGURATION],
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
          [machineId, partId, machineVersionId, CONFIGURATION, fitmentNote, fitmentSourceRecordId],
        );
      }
    }
  },
};
