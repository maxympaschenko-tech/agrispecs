import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type ModelSeed = { slug: string; model: string; url: string; externalId: string };

const CURRENT_VERSION = 'united-states-current-2026-09-next-generation';
const PARTS = ['47450038', '48138563'] as const;

const models: ModelSeed[] = [
  {
    slug: 'powerstar-90',
    model: 'PowerStar 90',
    url: 'https://www.messicks.com/catalogs/new-holland/powerstar-90-dual-command-tractor-1-5-wide-st/90-platform-cab-bodywork-and-decals/90-160-bl-030-90-160-bl-030-cab-interior-trim-right-side-w-o-mid-mount-control-valve-var-349130009-349131009-349133009-349134009-350239009-350240009-351301001-351301003-351302001-351302003-351303001-3',
    externalId: 'messicks-powerstar90-stagev-rops-my24-core-filters-2026-09',
  },
  {
    slug: 'powerstar-110',
    model: 'PowerStar 110',
    url: 'https://www.messicks.com/catalogs/new-holland/powerstar-110-dual-command-tractor-1-5-wide-s/35-hydraulic-systems/35-204-be-100-35-204-be-100-2-remote-control-valves-float-valve-components-80-lpm-var-351282001-351282002-351282003-351284001-351284002-351284003-351286001-351286002-351286003-351288001-351288002-3512',
    externalId: 'messicks-powerstar110-stagev-rops-my24-core-filters-2026-09',
  },
  {
    slug: 'powerstar-120',
    model: 'PowerStar 120',
    url: 'https://www.messicks.com/catalogs/new-holland/powerstar-120-dual-command-tractor-1-5-wide-s/10-engine/10-250-010-10-250-010-turbocharger',
    externalId: 'messicks-powerstar120-stagev-rops-my24-core-filters-2026-09',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar MY24 ROPS core-filter migration dependency.');
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

export const newHollandPowerStarMy24RopsCoreFiltersMigration: DbMigration = {
  id: '20260903_605_new_holland_powerstar_my24_rops_core_filters',
  description: 'Add exact Stage V MY24 ROPS fitment for PowerStar 90/110/120 fuel pre-filter 47450038 and engine oil filter 48138563',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const partIds = new Map<string, number>();
    for (const partNumber of PARTS) {
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

    for (const model of models) {
      const sourceRecordId = await ensureSourceRecord(
        connection,
        sourceId,
        model.externalId,
        model.url,
        `Messick's ${model.model} Dual Command Stage V ROPS MY24 catalog`,
        {
          role: 'Exact model/configuration fitment evidence',
          model: model.model,
          configuration: 'Dual Command 1.5, wide, Stage V, ROPS, MY24 catalog (09/25)',
          listedServiceParts: [
            { partNumber: '47450038', description: 'FILTER CARTRIDGE' },
            { partNumber: '48138563', description: 'FILTER, ENGINE OIL' },
          ],
          evidence: `The exact ${model.model} Stage V ROPS MY24 catalog lists both 47450038 and 48138563 among machine-specific frequently purchased/service parts.`,
          confidence: 'secondary/high',
          guardrail: 'PowerStar 100 ROPS is excluded because equivalent exact part-row evidence was not captured. No other filters are inferred from this catalog.',
        },
      );

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
      const configurationNote = 'Next-generation US PowerStar; Dual Command 1.5, wide, Stage V, ROPS, MY24 catalog (09/25)';

      for (const partNumber of PARTS) {
        const partId = partIds.get(partNumber);
        if (!partId) throw new Error(`Missing ${partNumber} part dependency.`);
        const role = partNumber === '47450038' ? 'fuel pre-filter / filter cartridge' : 'engine oil filter';
        const fitmentNote = `${partNumber} ${role} is listed in the exact ${model.model} Dual Command Stage V ROPS MY24 catalog. Confirm engine/build configuration before ordering.`;
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
  },
};
