import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartDef = {
  number: string;
  name: string;
  officialUrl: string;
  officialExternalId: string;
  fitmentSourceName: string;
  fitmentDomain: string;
  fitmentUrl: string;
  fitmentExternalId: string;
  fitmentEvidence: string;
};

const VERSION_SLUG = 'stage-v-2020-market-unspecified';
const configurations = ['AutoCommand', 'Dynamic Command', 'Electro Command'] as const;
const models = [
  { slug: 't6-145', model: 'T6.145' },
  { slug: 't6-155', model: 'T6.155' },
  { slug: 't6-160', model: 'T6.160' },
  { slug: 't6-175', model: 'T6.175' },
  { slug: 't6-180', model: 'T6.180' },
] as const;

const parts: PartDef[] = [
  {
    number: '5802726987',
    name: 'Fuel Pre-Filter',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/fuel-filters/fuel-filter/p/5802726987',
    officialExternalId: 'mycnh-5802726987-fuel-prefilter-identity-2026-09',
    fitmentSourceName: 'Okonomi-deler',
    fitmentDomain: 'okonomi-deler.no',
    fitmentUrl: 'https://www.okonomi-deler.no/dieselfilter-fg-5802726987',
    fitmentExternalId: 'okonomi-deler-5802726987-t6-stagev-fitment-2026-09',
    fitmentEvidence: 'The application list explicitly includes T6.145, T6.155, T6.160, T6.175 and T6.180 Stage V across Electro Command, Dynamic Command and Auto Command families.',
  },
  {
    number: '84328598',
    name: 'Fuel Filter',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/fuel-filters/fuel-filter/p/84328598',
    officialExternalId: 'mycnh-84328598-fuel-filter-identity-2026-09',
    fitmentSourceName: 'Agricola Trivino',
    fitmentDomain: 'agricolatrivino.com',
    fitmentUrl: 'https://agricolatrivino.com/producto/filtro-combustible/',
    fitmentExternalId: 'agricola-trivino-84328598-t6-stagev-fitment-2026-09',
    fitmentEvidence: 'The application table explicitly lists T6.145, T6.155, T6.160, T6.175 and T6.180 Stage V for Dynamic Command, Electro Command and Auto Command from the 07/20 catalog family.',
  },
  {
    number: '92129321',
    name: 'Fuel Filter',
    officialUrl: 'https://www.mycnhstore.com/eu/en/casece/cn/fuel-filter/p/92129321',
    officialExternalId: 'mycnh-92129321-fuel-filter-identity-2026-09',
    fitmentSourceName: 'Zemes Ukio Dalys',
    fitmentDomain: 'zemesukiodalys.lt',
    fitmentUrl: 'https://zemesukiodalys.lt/90399-case-ih-maxxum-125-cvxdrive-stage-v-92129321-kuro-filtras.html',
    fitmentExternalId: 'zemes-ukio-92129321-t6-stagev-fitment-2026-09',
    fitmentEvidence: 'The application table explicitly lists T6.145, T6.155, T6.160, T6.175 and T6.180 Stage V for Dynamic Command, Electro Command and Auto Command from the 07/20 catalog family.',
  },
];

const legacy5802726987 = ['42579930', '5802462138', '5802541165', '5802541169', '5802729687'] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V fuel-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`, [name, domain]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
}

async function ensureRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandT6StageVFuelFiltersMigration: DbMigration = {
  id: '20260905_648_new_holland_t6_stagev_fuel_filters',
  description: 'Add three distinct source-backed T6 Stage V fuel-filter positions without asserting current-US market scope',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);
    const officialSourceId = await ensureSource(connection, 'MyCNH Store', 'mycnhstore.com', 'manufacturer', 'official');

    const partIds = new Map<string, number>();
    const fitmentRecords = new Map<string, number>();

    for (const part of parts) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number, part.name],
      );
      const partId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, part.number]);
      partIds.set(part.number, partId);

      await ensureRecord(
        connection,
        officialSourceId,
        part.officialExternalId,
        part.officialUrl,
        `MyCNH ${part.number} ${part.name} identity`,
        {
          role: 'Official CNH part identity',
          partNumber: part.number,
          name: part.name,
          guardrail: 'This record establishes part identity only. T6 fitment is sourced separately and is not treated as current-US fitment.',
        },
      );

      const fitmentSourceId = await ensureSource(connection, part.fitmentSourceName, part.fitmentDomain, 'supplier', 'secondary');
      const fitmentRecordId = await ensureRecord(
        connection,
        fitmentSourceId,
        part.fitmentExternalId,
        part.fitmentUrl,
        `${part.fitmentSourceName} ${part.number} T6 Stage V fitment`,
        {
          role: 'Exact model/transmission Stage V fitment evidence',
          partNumber: part.number,
          models: models.map((model) => model.model),
          configurations: [...configurations],
          catalogStart: '07/20',
          evidence: part.fitmentEvidence,
          guardrail: 'The application rows do not identify the market as North America. Fitment is therefore stored only in the existing market-unspecified Stage V version.',
        },
      );
      fitmentRecords.set(part.number, fitmentRecordId);
    }

    const messicksSourceId = await ensureSource(connection, "Messick's", 'messicks.com', 'supplier', 'secondary');
    const replacementRecordId = await ensureRecord(
      connection,
      messicksSourceId,
      'messicks-5802726987-replacements-2026-09',
      'https://www.messicks.com/parts/new-holland/5802726987',
      "Messick's 5802726987 fuel pre-filter replacement listing",
      {
        currentPartNumber: '5802726987',
        legacyPartNumbers: [...legacy5802726987],
        statement: 'Messick’s states that 5802726987 replaces 42579930, 5802462138, 5802541165, 5802541169 and 5802729687. KHH25460 is also listed by the source but is omitted here to avoid mixing a potentially different numbering namespace.',
        guardrail: 'Replacement evidence does not transfer T6 machine fitment to the legacy numbers.',
      },
    );

    const currentPreFilterId = partIds.get('5802726987');
    if (!currentPreFilterId) throw new Error('Missing 5802726987 part dependency.');
    for (const legacy of legacy5802726987) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, legacy, legacy, 'Fuel Pre-Filter'],
      );
      const legacyId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, legacy]);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyId, currentPreFilterId, replacementRecordId],
      );
    }

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const part of parts) {
        const partId = partIds.get(part.number);
        const fitmentRecordId = fitmentRecords.get(part.number);
        if (!partId || !fitmentRecordId) throw new Error(`Missing ${part.number} fitment dependency.`);

        for (const configuration of configurations) {
          const configurationNote = `${configuration}, Stage V, catalog family from 07/20, market not specified`;
          const fitmentNote = `${part.number} ${part.name} is directly listed for ${model.model} ${configuration} Stage V in the cited application table. This is one distinct fuel-system service position; do not substitute another T6 fuel-filter number unless replacement evidence explicitly says so. Market is not stated, so verify the regional parts book and build before ordering.`;
          const [existing] = await connection.query<IdRow[]>(
            `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
            [machineId, partId, versionId, configurationNote],
          );
          if (existing[0]) {
            await connection.query(
              `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
              [fitmentNote, fitmentRecordId, Number(existing[0].id)],
            );
          } else {
            await connection.query(
              `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
               VALUES (?,?,?,?,?,'high',?)`,
              [machineId, partId, versionId, configurationNote, fitmentNote, fitmentRecordId],
            );
          }
        }
      }
    }
  },
};
