import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartDef = { number: string; name: string; officialUrl: string; officialExternalId: string };
type FitmentDef = { slug: 't6-175' | 't6-180'; model: string; configuration: string; url: string; externalId: string; parts: string[] };

const VERSION_SLUG = 'stage-v-2020-market-unspecified';

const parts: PartDef[] = [
  {
    number: '47863571',
    name: 'Cab Air Filter',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/air-filter/p/47863571',
    officialExternalId: 'mycnh-47863571-cab-air-filter-identity-2026-09',
  },
  {
    number: '87726694',
    name: 'A/C Foam Pre-Filter',
    officialUrl: 'https://www.mycnhstore.com/anz/en/caseih/cn/cab-filter/p/87726694',
    officialExternalId: 'mycnh-87726694-ac-foam-prefilter-identity-2026-09',
  },
  {
    number: '87726699',
    name: 'Cab Air Filter Panel',
    officialUrl: 'https://www.mycnhstore.com/gb/en/newhollandag/category/filters/cab-filters/cab-filter/p/87726699',
    officialExternalId: 'mycnh-87726699-cab-filter-panel-identity-2026-09',
  },
  {
    number: '87726695',
    name: 'Cab Air Filter Panel',
    officialUrl: 'https://www.mycnhstore.com/eu/en/steyr/cn/cab-filter/p/87726695',
    officialExternalId: 'mycnh-87726695-cab-filter-panel-identity-2026-09',
  },
  {
    number: '92247265',
    name: 'Cab Recirculation Filter',
    officialUrl: 'https://www.mycnhstore.com/eu/en/caseih/eu/tractors/agricultural/euaa01agr046maxxum/tractor-tier-3-limited/general/maintenance-parts-filters/cn/27056C80-0035-45DA-8D97-61CB3F44F0E0/F1A30039-81AA-4B57-8519-0E807E036E8C',
    officialExternalId: 'mycnh-92247265-cab-recirculation-filter-identity-2026-09',
  },
];

const fitments: FitmentDef[] = [
  {
    slug: 't6-175',
    model: 'T6.175',
    configuration: 'Dynamic Command Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-175-dynamic-command-sidewinder-ii-stage-v/ms12927?modelspecuid=12927',
    externalId: 'alg-land-t6-175-dynamic-stagev-cab-filters-2026-09',
    parts: ['47863571', '87726694', '87726699'],
  },
  {
    slug: 't6-180',
    model: 'T6.180',
    configuration: 'AutoCommand Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-180-auto-command-sidewinder-ii-stage-v/ms12735',
    externalId: 'alg-land-t6-180-autocommand-stagev-cab-filters-2026-09',
    parts: ['47863571', '87726694', '87726695', '92247265'],
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V cab-filter migration dependency.');
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

export const newHollandT6StageVCabFiltersMigration: DbMigration = {
  id: '20260905_652_new_holland_t6_stagev_cab_filters',
  description: 'Add exact T6.175 Dynamic Command and T6.180 AutoCommand Stage V cab-filter sets without merging configuration-specific filter positions',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='cab-filters' LIMIT 1`);
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
          role: 'Official CNH cab-filter identity',
          partNumber: part.number,
          name: part.name,
          guardrail: 'Official identity only. Exact T6 Stage V machine/configuration fitment is sourced separately.',
        },
      );
    }

    for (const fitment of fitments) {
      const fitmentRecordId = await ensureRecord(
        connection,
        fitmentSourceId,
        fitment.externalId,
        fitment.url,
        `Algard Landbrukssenter ${fitment.model} Stage V cab-filter list`,
        {
          role: 'Exact model/configuration cab-filter evidence',
          model: fitment.model,
          configuration: fitment.configuration,
          listedParts: fitment.parts,
          guardrail: 'The T6.175 Dynamic and T6.180 AutoCommand pages expose different cab-filter sets. Those sets are stored separately and are not treated as interchangeable or symmetric across T6 transmissions.',
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
        const fitmentNote = `${partNumber} ${part.name} is directly listed on the exact ${fitment.model} ${fitment.configuration} service-parts page. Cab filter positions differ by configuration; do not substitute another listed T6 cab filter solely because dimensions or model family are similar. Market is not stated.`;
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
