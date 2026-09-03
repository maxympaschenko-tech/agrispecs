import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '87491693';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/87491693';
const FITMENT_EXTERNAL_ID = 'messicks-t5-130-140-stagev-87491693-brake-reservoir-filter-2026-09';
const OFFICIAL_URL = 'https://loja.newhollandag.com.br/category/filtros/filtros-de-leo/filtro/p/87491693';
const OFFICIAL_EXTERNAL_ID = 'new-holland-official-87491693-brake-reservoir-filter-identity-2026-09';

const models = [
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 brake-reservoir-filter migration dependency.');
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

export const newHollandT5130140BrakeReservoirFilterMigration: DbMigration = {
  id: '20260903_612_new_holland_t5_130_140_brake_reservoir_filter',
  description: 'Add exact T5.130/T5.140 Stage V brake-fluid reservoir filter 87491693 fitment and OEM identity provenance',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug)
       VALUES (?,'Brake System Filters','brake-system-filters')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='brake-system-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Brake Fluid Reservoir Filter'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
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

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      `Messick's New Holland ${PART_NUMBER} T5.130/T5.140 Stage V brake-reservoir catalog`,
      {
        role: 'Exact model/configuration fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: "Messick's lists 87491693 in both maintenance-parts/filter and brake-fluid-reservoir catalog paths for T5.130 and T5.140 AutoCommand and Dynamic Command Stage V North American tractor families. MY21 and MY23 catalog entries further corroborate the same application families.",
        confidence: 'secondary/high',
        guardrail: 'No T5.110/T5.120, transmission variant outside AutoCommand/Dynamic Command, or non-Stage-V fitment is added by this migration even though the part has broader applications.',
      },
    );

    let [officialRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Agriculture Parts' AND domain='loja.newhollandag.com.br' ORDER BY id LIMIT 1`,
    );
    let officialSourceId = officialRows[0]?.id ? Number(officialRows[0].id) : 0;
    if (!officialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Agriculture Parts','loja.newhollandag.com.br','manufacturer','official')`,
      );
      officialSourceId = Number(result.insertId);
    }

    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'New Holland 87491693 Brake Fluid Reservoir Filter',
      {
        role: 'Official OEM part identity and function corroboration',
        partNumber: PART_NUMBER,
        name: 'Brake Fluid Reservoir Filter',
        description: 'Official New Holland product listing identifies 87491693 as a filter installed at the bottom of the brake reservoir to protect the brake system from contaminants.',
        publishedSpecs: { filtrationMicrons: 120, outsideDiameterMm: 34, lengthMm: 29 },
        fitmentScope: 'Identity/function only; exact T5.130/T5.140 fitment is sourced separately from the machine-specific Messick\'s catalog.',
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
        const configurationNote = configuration.note;
        const fitmentNote = `${PART_NUMBER} Brake Fluid Reservoir Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American maintenance and brake-fluid-reservoir catalogs. Verify the brake reservoir configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
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
            [machineId, partId, machineVersionId, configurationNote, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
