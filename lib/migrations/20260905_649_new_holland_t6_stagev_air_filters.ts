import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION_SLUG = 'stage-v-2020-market-unspecified';
const parts = [
  {
    number: '87682990',
    name: 'Primary Engine Air Filter',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/air-filters/air-filter/p/87682990',
    officialExternalId: 'mycnh-87682990-primary-engine-air-filter-identity-2026-09',
  },
  {
    number: '87683000',
    name: 'Secondary Engine Air Filter',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/air-filters/air-filter/p/87683000',
    officialExternalId: 'mycnh-87683000-secondary-engine-air-filter-identity-2026-09',
  },
] as const;

const fitments = [
  {
    slug: 't6-175',
    model: 'T6.175',
    configuration: 'Dynamic Command Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-175-dynamic-command-sidewinder-ii-stage-v/ms12927?modelspecuid=12927',
    externalId: 'alg-land-t6-175-dynamic-stagev-air-filters-2026-09',
  },
  {
    slug: 't6-180',
    model: 'T6.180',
    configuration: 'AutoCommand Sidewinder II, Stage V, market not specified',
    url: 'https://alg-land.no/new-holland-t6-180-auto-command-sidewinder-ii-stage-v/ms12735',
    externalId: 'alg-land-t6-180-autocommand-stagev-air-filters-2026-09',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V air-filter migration dependency.');
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

export const newHollandT6StageVAirFiltersMigration: DbMigration = {
  id: '20260905_649_new_holland_t6_stagev_air_filters',
  description: 'Add exact T6.175 Dynamic Command and T6.180 AutoCommand Stage V primary/secondary engine air-filter fitment without inferring symmetric T6 coverage',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);
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
          role: 'Official CNH part identity and air-filter position',
          partNumber: part.number,
          name: part.name,
          guardrail: 'Official identity only. Exact T6 Stage V machine/transmission fitment is sourced separately.',
        },
      );
    }

    for (const fitment of fitments) {
      const fitmentRecordId = await ensureRecord(
        connection,
        fitmentSourceId,
        fitment.externalId,
        fitment.url,
        `Algard Landbrukssenter ${fitment.model} Stage V service-filter list`,
        {
          role: 'Exact model/configuration service-filter evidence',
          model: fitment.model,
          configuration: fitment.configuration,
          listedAirFilters: [
            { partNumber: '87682990', role: 'outer / primary engine air filter' },
            { partNumber: '87683000', role: 'inner / secondary engine air filter' },
          ],
          guardrail: 'Only this exact model/transmission configuration is inserted. The source does not justify copying these rows to neighboring T6 models or other transmissions.',
        },
      );

      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.slug],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const part of parts) {
        const partId = partIds.get(part.number);
        if (!partId) throw new Error(`Missing ${part.number} dependency.`);
        const fitmentNote = `${part.number} ${part.name} is directly listed in the exact ${fitment.model} ${fitment.configuration} service-parts page. Market is not stated. Confirm regional parts book and build before ordering.`;
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
