import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const EC_CONFIGURATION = 'ElectroCommand, Stage V, North America, 10/21 catalog';
const EC_SOURCE_URL = 'https://www.messicks.com/catalogs/new-holland/t5-110-electrocommand-tractor-stage-v-na-10-2/25-front-axle-system/25-100-140-25-100-140-var-762258-advanced-4wd-suspended-front-axle-w-brakes-w-moving-clutch-dog-var-337707880-tech-type-t5-110-ec-stage-v-na';
const EC_SOURCE_EXTERNAL_ID = 'messicks-t5-110-ec-stagev-na-84581942-correction-2026-09';

const dualParts = [
  {
    number: '47450037',
    name: 'Fuel Filter Cartridge',
    url: 'https://www.newhollandrochester.com/shop/47450037/',
    externalId: 'new-holland-rochester-47450037-t5-110-120-dual-stagev-na-2026-09',
  },
  {
    number: '47450038',
    name: 'Fuel Pre-Filter',
    url: 'https://www.newhollandrochester.com/shop/47450038/',
    externalId: 'new-holland-rochester-47450038-t5-110-120-dual-stagev-na-2026-09',
  },
] as const;

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

const dualConfigurations = [
  {
    note: 'Dual Command, Cab, Stage V, North America, 06/21-open catalog range',
    catalogLabel: 'DUAL COMMAND TRACTOR - CAB - STAGE V (NA)',
  },
  {
    note: 'Dual Command, L/Cab, Stage V, North America, 06/21-open catalog range',
    catalogLabel: 'DUAL COMMAND TRACTOR - L/CAB - STAGE V (NA)',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 current core-filter correction dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,'supplier','secondary')`,
    [name, domain],
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

export const newHollandT5CurrentCoreFilterCorrectionMigration: DbMigration = {
  id: '20260905_640_new_holland_t5_current_core_filter_correction',
  description: 'Correct T5.110 ElectroCommand hydraulic-filter omission and add exact T5.110/T5.120 Dual Command Stage V North America fuel-filter fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const messicksSourceId = await ensureSource(connection, "Messick's", 'messicks.com');
    const rochesterSourceId = await ensureSource(connection, 'New Holland Rochester', 'newhollandrochester.com');

    const hydraulicPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='84581942' LIMIT 1`,
      [manufacturerId],
    );
    const t5110MachineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='t5-110' LIMIT 1`,
    );
    const t5110CurrentVersionId = await selectId(
      connection,
      `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
      [t5110MachineId, CURRENT_VERSION],
    );

    const ecSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      EC_SOURCE_EXTERNAL_ID,
      EC_SOURCE_URL,
      "Messick's T5.110 ElectroCommand Stage V North America catalog - 84581942 hydraulic filter correction",
      {
        role: 'Exact T5.110 ElectroCommand Stage V North America hydraulic-filter fitment evidence',
        model: 'T5.110',
        configuration: EC_CONFIGURATION,
        partNumber: '84581942',
        evidence: 'The exact T5.110 ELECTROCOMMAND TRACTOR - STAGE V (NA) 10/21 catalog lists FILTER, HYDRAULI part 84581942 in its frequently purchased/service-parts set alongside the other core filters.',
        correction: 'Migration 607 intentionally omitted 84581942 for T5.110 because the then-visible excerpt did not expose the hydraulic filter. The exact catalog now exposes it directly, so the asymmetry can be corrected without inference.',
        confidence: 'secondary/high',
        guardrail: 'Fitment remains limited to T5.110 ElectroCommand Stage V North America 10/21. No Dual Command, AutoCommand or Dynamic Command fitment is inferred from this record.',
      },
    );

    const ecFitmentNote = '84581942 Hydraulic Oil Filter is directly listed in the exact T5.110 ElectroCommand Stage V North America 10/21 catalog. This corrects the earlier evidence-limited omission in migration 607; confirm transmission and build configuration before ordering.';
    const [existingEc] = await connection.query<IdRow[]>(
      `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
      [t5110MachineId, hydraulicPartId, t5110CurrentVersionId, EC_CONFIGURATION],
    );
    if (existingEc[0]) {
      await connection.query(
        `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
        [ecFitmentNote, ecSourceRecordId, Number(existingEc[0].id)],
      );
    } else {
      await connection.query(
        `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
         VALUES (?,?,?,?,?,'high',?)`,
        [t5110MachineId, hydraulicPartId, t5110CurrentVersionId, EC_CONFIGURATION, ecFitmentNote, ecSourceRecordId],
      );
    }

    for (const part of dualParts) {
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.number],
      );
      const sourceRecordId = await ensureSourceRecord(
        connection,
        rochesterSourceId,
        part.externalId,
        part.url,
        `New Holland Rochester ${part.number} exact T5.110/T5.120 Dual Command Stage V North America fitment`,
        {
          role: 'Exact current-part model/transmission/cab/region fitment evidence',
          partNumber: part.number,
          partName: part.name,
          supportedModels: models.map((item) => item.model),
          supportedConfigurations: dualConfigurations.map((item) => item.catalogLabel),
          evidence: `${part.number} directly lists T5.110 and T5.120 under both Dual Command Tractor - Cab - Stage V (NA) and Dual Command Tractor - L/Cab - Stage V (NA), beginning 06/21 with an open-ended catalog range.`,
          confidence: 'secondary/high',
          guardrail: 'Only the exact Dual Command Stage V North America Cab/L-Cab families are inserted here. Electro Command, AutoCommand and Dynamic Command rows remain separately sourced.',
        },
      );

      for (const model of models) {
        const machineId = await selectId(
          connection,
          `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
          [model.slug],
        );
        const currentVersionId = await selectId(
          connection,
          `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
          [machineId, CURRENT_VERSION],
        );

        for (const configuration of dualConfigurations) {
          const fitmentNote = `${part.number} ${part.name} is directly listed for ${model.model} ${configuration.catalogLabel}, beginning 06/21 in the cited North American part application table. Confirm Cab/L-Cab and transmission configuration before ordering.`;
          const [existing] = await connection.query<IdRow[]>(
            `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
            [machineId, partId, currentVersionId, configuration.note],
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
              [machineId, partId, currentVersionId, configuration.note, fitmentNote, sourceRecordId],
            );
          }
        }
      }
    }
  },
};
