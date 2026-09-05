import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type PartDef = {
  number: string;
  name: string;
  officialUrl: string;
  officialExternalId: string;
};

type FitmentDef = {
  slug: 't6-175' | 't6-180';
  model: string;
  configuration: string;
  url: string;
  externalId: string;
  parts: string[];
};

const VERSION_SLUG = 'stage-v-2020-market-unspecified';

const parts: PartDef[] = [
  {
    number: '48142232',
    name: 'Hydraulic Oil Filter',
    officialUrl: 'https://www.mycnhstore.com/eu/en/newhollandag/cn/hydraulic-oil-filter/p/48142232',
    officialExternalId: 'mycnh-48142232-hydraulic-oil-filter-identity-2026-09',
  },
  {
    number: '48131202',
    name: 'Hydraulic Oil Filter',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/hydraulic-oil-filter/p/48131202',
    officialExternalId: 'mycnh-48131202-hydraulic-oil-filter-identity-2026-09',
  },
  {
    number: '87708150',
    name: 'Hydraulic Oil Suction Filter',
    officialUrl: 'https://www.mycnhstore.com/eu/en/caseih/cn/hydraulic-oil-filter/p/87708150',
    officialExternalId: 'mycnh-87708150-hydraulic-oil-suction-filter-identity-2026-09',
  },
];

const fitments: FitmentDef[] = [
  {
    slug: 't6-175',
    model: 'T6.175',
    configuration: 'Dynamic Command Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-175-dynamic-command-sidewinder-ii-stage-v/ms12927?modelspecuid=12927',
    externalId: 'alg-land-t6-175-dynamic-stagev-hydraulic-filters-2026-09',
    parts: ['48142232', '87708150'],
  },
  {
    slug: 't6-180',
    model: 'T6.180',
    configuration: 'AutoCommand Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-180-auto-command-sidewinder-ii-stage-v/ms12735',
    externalId: 'alg-land-t6-180-autocommand-stagev-hydraulic-filters-2026-09',
    parts: ['48131202', '87708150'],
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V hydraulic-filter migration dependency.');
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

export const newHollandT6StageVHydraulicFiltersMigration: DbMigration = {
  id: '20260905_650_new_holland_t6_stagev_hydraulic_filters',
  description: 'Add exact T6.175 Dynamic Command and T6.180 AutoCommand Stage V hydraulic filter positions while excluding misclassified DEF filter 5802776000',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);
    const officialSourceId = await ensureSource(connection, 'MyCNH Store', 'mycnhstore.com', 'manufacturer', 'official');
    const fitmentSourceId = await ensureSource(connection, 'Algard Landbrukssenter', 'alg-land.no', 'supplier', 'secondary');

    const partIds = new Map<string, number>();
    for (const part of parts) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number, part.name],
      );
      partIds.set(part.number, await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, part.number]));

      await ensureRecord(
        connection,
        officialSourceId,
        part.officialExternalId,
        part.officialUrl,
        `MyCNH ${part.number} ${part.name} identity`,
        {
          role: 'Official CNH hydraulic-filter identity',
          partNumber: part.number,
          name: part.name,
          guardrail: 'Official identity only. Exact T6 Stage V configuration fitment is sourced separately.',
        },
      );
    }

    for (const fitment of fitments) {
      const fitmentRecordId = await ensureRecord(
        connection,
        fitmentSourceId,
        fitment.externalId,
        fitment.url,
        `Algard Landbrukssenter ${fitment.model} Stage V hydraulic service-parts list`,
        {
          role: 'Exact model/configuration hydraulic-filter evidence',
          model: fitment.model,
          configuration: fitment.configuration,
          listedParts: fitment.parts,
          excludedPart: {
            partNumber: '5802776000',
            reason: 'The dealer page groups this item under hydraulics, but official MyCNH catalogs identify 5802776000 as a DEF module / DENOX ECU filter. It is therefore intentionally excluded from hydraulic fitment in this migration.',
          },
          guardrail: 'Only the exact hydraulic-filter numbers with official hydraulic identities are inserted. No neighboring model/transmission fitment is inferred.',
        },
      );

      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.slug],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const partNumber of fitment.parts) {
        const partId = partIds.get(partNumber);
        const part = parts.find((item) => item.number === partNumber);
        if (!partId || !part) throw new Error(`Missing ${partNumber} dependency.`);
        const fitmentNote = `${partNumber} ${part.name} is directly listed in the exact ${fitment.model} ${fitment.configuration} service-parts page and has an official CNH hydraulic-filter identity. Market is not stated; verify regional parts book and build before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, versionId, fitment.configuration],
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
            [machineId, partId, versionId, fitment.configuration, fitmentNote, fitmentRecordId],
          );
        }
      }
    }
  },
};
