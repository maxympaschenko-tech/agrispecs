import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type DefPart = {
  number: string;
  name: string;
  role: string;
  fitmentUrl: string;
  fitmentExternalId: string;
  officialUrl: string;
  officialExternalId: string;
  officialDetails: Record<string, unknown>;
};

const CURRENT_VERSION = 'united-states-current-2026-08';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, North America, exact 2019-2022 fitment listing' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, exact 2020-2022 fitment listing' },
] as const;

const parts: DefPart[] = [
  {
    number: '47674634',
    name: 'DEF Tank Sender Filter',
    role: '70-micron DEF filter on the DEF tank sender unit',
    fitmentUrl: 'https://parts.southeasternequip.com/products/47674634-oem-def-filter-11-mm-od-x-22-l-70-case-construction',
    fitmentExternalId: 'southeastern-47674634-t5-stagev-na-nafta-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/ie/en/caseih/category/filters/filters-comp/filter-def/p/47674634',
    officialExternalId: 'mycnh-47674634-def-filter-identity-2026-09',
    officialDetails: {
      name: 'DEF Filter',
      outsideDiameterMm: 11,
      lengthMm: 22,
      filtrationMicrons: 70,
      function: 'Removes contaminants to support proper SCR-system operation.',
      servicePosition: 'DEF tank sender unit',
    },
  },
  {
    number: '47748585',
    name: 'Main DEF Filter',
    role: 'main DEF/DENOX filter',
    fitmentUrl: 'https://parts.southeasternequip.com/products/47748585-oem-filter-element-case-construction',
    fitmentExternalId: 'southeastern-47748585-t5-stagev-na-nafta-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/fuel-filters/element/p/47748585',
    officialExternalId: 'mycnh-47748585-main-def-filter-identity-2026-09',
    officialDetails: {
      name: 'Diesel Exhaust Fluid Filter',
      outsideDiameterMm: 53,
      lengthMm: 94.9,
      function: 'Removes contaminants to support proper SCR-system operation.',
      servicePosition: 'Main DEF/DENOX filter',
      maintenanceContext: 'MyCNH maintenance catalogs identify 47748585 as the main DEF/AdBlue filter; interval depends on the exact machine/manual context.',
    },
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 Stage V DEF-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
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

export const newHollandT5StageVDefFiltersMigration: DbMigration = {
  id: '20260905_633_new_holland_t5_stagev_def_filters',
  description: 'Add exact T5.110-T5.140 AutoCommand/Dynamic Command Stage V DEF tank-sender and main DEF filters',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId, 'DEF / SCR Filters', 'def-scr-filters'],
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='def-scr-filters' LIMIT 1`);

    const fitmentSourceId = await ensureSource(
      connection,
      'Southeastern Equipment',
      'parts.southeasternequip.com',
      'supplier',
      'secondary',
    );
    const officialSourceId = await ensureSource(
      connection,
      'MyCNH Store',
      'mycnhstore.com',
      'manufacturer',
      'official',
    );

    for (const part of parts) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number, part.name],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.number],
      );

      const fitmentSourceRecordId = await ensureSourceRecord(
        connection,
        fitmentSourceId,
        part.fitmentExternalId,
        part.fitmentUrl,
        `Southeastern Equipment ${part.number} exact T5 Stage V NA/NAFTA fitment`,
        {
          role: 'Exact model/transmission/region fitment evidence',
          partNumber: part.number,
          supportedModels: models.map((model) => model.model),
          supportedConfigurations: configurations.map((configuration) => configuration.note),
          evidence: 'The application table explicitly lists T5.110, T5.120, T5.130 and T5.140 AutoCommand Tractor Stage V (NA) and Dynamic Command Tractor Stage V (NAFTA).',
          sourceYearWindow: { autoCommand: '2019-2022', dynamicCommand: '2020-2022' },
          confidence: 'secondary/high',
          guardrail: `This migration models ${part.number} only as ${part.role}. It does not infer later model-year continuation beyond the exact table window and does not equate this part with other DEF filters or filler-neck strainers.`,
        },
      );

      await ensureSourceRecord(
        connection,
        officialSourceId,
        part.officialExternalId,
        part.officialUrl,
        `MyCNH ${part.number} DEF filter identity`,
        {
          role: 'Official CNH part identity, function and service position',
          partNumber: part.number,
          ...part.officialDetails,
          fitmentScope: 'Official identity/function only; exact North American T5 model/transmission fitment is sourced separately.',
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
          const fitmentNote = `${part.number} ${part.name} is directly listed for the exact ${model.model} ${configuration.key} Stage V North American family in the cited fitment table. Source coverage is limited to ${configuration.key === 'AutoCommand' ? '2019-2022' : '2020-2022'}; confirm build date and DEF service position before ordering.`;
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
    }
  },
};
