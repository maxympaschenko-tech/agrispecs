import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type PartKey = '84581942' | '48195967' | '47565055';
type ModelSlug = 'powerstar-100' | 'powerstar-110' | 'powerstar-120';

type ModelSeed = {
  slug: ModelSlug;
  model: string;
};

const CURRENT_VERSION = 'united-states-current-2026-09-next-generation';

const models: ModelSeed[] = [
  { slug: 'powerstar-100', model: 'PowerStar 100' },
  { slug: 'powerstar-110', model: 'PowerStar 110' },
  { slug: 'powerstar-120', model: 'PowerStar 120' },
];

const sources: Record<PartKey, { url: string; externalId: string; title: string; evidence: string }> = {
  '84581942': {
    url: 'https://www.messicks.com/parts/case/84581942',
    externalId: 'messicks-powerstar-my25-powershuttle-84581942-2026-09',
    title: "Messick's PowerStar MY25 Power Shuttle 84581942 hydraulic-filter catalog",
    evidence: 'Exact Stage V PowerStar 100/110/120 Power Shuttle MY25 Cab and ROPS catalog paths list 84581942 in hydraulic-oil-filter diagram 35.100.AP[010].',
  },
  '48195967': {
    url: 'https://www.messicks.com/parts/new-holland/48195967',
    externalId: 'messicks-powerstar-my25-powershuttle-48195967-2026-09',
    title: "Messick's PowerStar MY25 Power Shuttle 48195967 hydraulic-filter catalog",
    evidence: 'Exact Stage V PowerStar 100/110/120 Power Shuttle MY25 Cab and ROPS catalog paths list 48195967 in hydraulic-pump/filter/line diagram 41.200.AL[030].',
  },
  '47565055': {
    url: 'https://messicks.com/parts/new-holland/47565055',
    externalId: 'messicks-powerstar-my25-powershuttle-47565055-2026-09',
    title: "Messick's PowerStar MY25 Power Shuttle 47565055 cab-filter catalog",
    evidence: 'Exact Stage V PowerStar 100/110/120 Power Shuttle MY25 Cab catalog paths list 47565055 in cab HVAC/air-duct diagrams 50.104.AP[040]/[050].',
  },
};

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar MY25 Power Shuttle filter migration dependency.');
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

export const newHollandPowerStarMy25PowerShuttleFiltersMigration: DbMigration = {
  id: '20260903_602_new_holland_powerstar_my25_powershuttle_filters',
  description: 'Add exact MY25 Stage V PowerStar 100/110/120 Power Shuttle Cab/ROPS hydraulic and cab-filter variants',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

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

    const partIds = new Map<PartKey, number>();
    for (const partNumber of Object.keys(sources) as PartKey[]) {
      partIds.set(
        partNumber,
        await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, partNumber],
        ),
      );
    }

    const sourceRecordIds = new Map<PartKey, number>();
    for (const [partNumber, source] of Object.entries(sources) as Array<[PartKey, (typeof sources)[PartKey]]>) {
      sourceRecordIds.set(
        partNumber,
        await ensureSourceRecord(
          connection,
          messicksSourceId,
          source.externalId,
          source.url,
          source.title,
          {
            role: 'Exact Stage V MY25 Power Shuttle model/configuration fitment evidence',
            partNumber,
            supportedModels: ['PowerStar 100', 'PowerStar 110', 'PowerStar 120'],
            evidence: source.evidence,
            confidence: 'secondary/high',
            guardrail: partNumber === '47565055'
              ? 'Cab-only part. No ROPS fitment is inserted for 47565055.'
              : 'Hydraulic fitment is inserted separately for Cab and ROPS MY25 Power Shuttle configurations. PowerStar 90 and 75 are not inferred.',
          },
        ),
      );
    }

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

      for (const station of ['Cab', 'ROPS'] as const) {
        for (const partNumber of ['84581942', '48195967'] as const) {
          const partId = partIds.get(partNumber);
          const sourceRecordId = sourceRecordIds.get(partNumber);
          if (!partId || !sourceRecordId) throw new Error(`Missing ${partNumber} dependency.`);

          const configurationNote = `Next-generation US PowerStar; Power Shuttle, Stage V, ${station}, MY25`;
          const fitmentNote = `${partNumber} hydraulic filter is listed in the exact ${model.model} Power Shuttle Stage V ${station} MY25 catalog. Confirm hydraulic/transmission build configuration before ordering.`;
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

      const cabPartId = partIds.get('47565055');
      const cabSourceRecordId = sourceRecordIds.get('47565055');
      if (!cabPartId || !cabSourceRecordId) throw new Error('Missing 47565055 dependency.');
      const cabConfigurationNote = 'Next-generation US PowerStar; Power Shuttle, Stage V, Cab, MY25';
      const cabFitmentNote = `Cab air filter 47565055 is listed in the exact ${model.model} Power Shuttle Stage V Cab MY25 HVAC/air-duct catalog. Cab-only application; verify HVAC configuration before ordering.`;
      const [existingCab] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, cabPartId, machineVersionId, cabConfigurationNote],
      );
      if (existingCab[0]) {
        await connection.query(
          `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
          [cabFitmentNote, cabSourceRecordId, Number(existingCab[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, cabPartId, machineVersionId, cabConfigurationNote, cabFitmentNote, cabSourceRecordId],
        );
      }
    }
  },
};
