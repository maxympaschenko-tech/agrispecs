import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  series: 'JAGUAR 900' | 'JAGUAR 1000';
  sourceUrl: string;
  engineModel: string;
  cylinderArrangement: string;
  knifeDrum: string;
  maximumHp?: number;
};

const VERSION = 'united-states-current-2026-08';
const JAGUAR_900_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesters/jaguar-900';
const JAGUAR_1000_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesters/jaguar-1000';
const FRONT_ATTACHMENTS_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesters/front-attachments';

const models: Seed[] = [
  { slug: 'jaguar-930', model: 'JAGUAR 930', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'Mercedes-Benz OM 471 LA', cylinderArrangement: 'In-line engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-940', model: 'JAGUAR 940', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'Mercedes-Benz OM 471 LA', cylinderArrangement: 'In-line engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-950', model: 'JAGUAR 950', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'Mercedes-Benz OM 473 LA', cylinderArrangement: 'In-line engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-960', model: 'JAGUAR 960', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'Mercedes-Benz OM 473 LA', cylinderArrangement: 'In-line engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-970', model: 'JAGUAR 970', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'MAN D4276', cylinderArrangement: 'In-line engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-980', model: 'JAGUAR 980', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX / V-MAX' },
  { slug: 'jaguar-990', model: 'JAGUAR 990', series: 'JAGUAR 900', sourceUrl: JAGUAR_900_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX / V-MAX', maximumHp: 925 },
  { slug: 'jaguar-1080', model: 'JAGUAR 1080', series: 'JAGUAR 1000', sourceUrl: JAGUAR_1000_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX', maximumHp: 850 },
  { slug: 'jaguar-1090', model: 'JAGUAR 1090', series: 'JAGUAR 1000', sourceUrl: JAGUAR_1000_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX', maximumHp: 925 },
  { slug: 'jaguar-1100', model: 'JAGUAR 1100', series: 'JAGUAR 1000', sourceUrl: JAGUAR_1000_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX', maximumHp: 1020 },
  { slug: 'jaguar-1200', model: 'JAGUAR 1200', series: 'JAGUAR 1000', sourceUrl: JAGUAR_1000_URL, engineModel: 'MAN D2862', cylinderArrangement: 'V-engine', knifeDrum: 'V-FLEX', maximumHp: 1110 },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
  ['Engine', 'engine.cylinder_arrangement', 'Cylinder arrangement', 'text', null, 20],
  ['Engine', 'engine.ece_r120_max_power', 'Maximum output (ECE R 120)', 'decimal', 'hp', 30],
  ['Harvesting System', 'forage.knife_drum_type', 'Knife drum type', 'text', null, 10],
  ['Harvesting System', 'forage.crop_flow_system', 'Crop flow system', 'text', null, 20],
  ['Harvesting System', 'forage.automation', 'Harvest automation', 'text', null, 30],
  ['Header Connection', 'forage.front_attachment_options', 'Front attachment families', 'text', null, 10],
  ['Header Connection', 'forage.orbis_working_width', 'ORBIS working width', 'text', null, 20],
  ['Header Connection', 'forage.pickup_working_width', 'PICK UP working width', 'text', null, 30],
  ['Kernel Processing', 'forage.kernel_processor_options', 'Kernel processor options', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CLAAS JAGUAR forage harvester migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='CLAAS' AND domain='claas.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('CLAAS','claas.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `claas-${model.slug}-spfh-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      model.sourceUrl,
      externalId,
      `CLAAS ${model.model} current US self-propelled forage harvester data`,
      JSON.stringify({
        captured: '2026-08-31',
        market: 'United States',
        equipmentType: 'Self-Propelled Forage Harvester',
        frontAttachmentsSource: FRONT_ATTACHMENTS_URL,
        note: 'JAGUAR 900 maximum-output values are left unpublished except where the current CLAAS US page explicitly states the value. Model identity, engine type, cylinder arrangement and knife-drum data come from the current US JAGUAR 900 specification table. Cylinder counts are intentionally not inferred from engine-family knowledge.',
        ...model,
      }),
    ],
  );
  return Number(result.insertId);
}

async function put(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const claasJaguarForageHarvestersCurrentUsMigration: DbMigration = {
  id: '20260831_497_claas_jaguar_forage_harvesters_current_us',
  description: 'Add current CLAAS US JAGUAR 900 and JAGUAR 1000 self-propelled forage harvesters',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Self-Propelled Forage Harvester','self-propelled-forage-harvester') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CLAAS','claas') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='self-propelled-forage-harvester' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of [
      { name: 'JAGUAR 900', slug: 'jaguar-900' },
      { name: 'JAGUAR 1000', slug: 'jaguar-1000' },
    ]) {
      await connection.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series.name, series.slug],
      );
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing CLAAS forage harvester definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesSlug = model.series === 'JAGUAR 900' ? 'jaguar-900' : 'jaguar-1000';
      const seriesId = await id(
        connection,
        `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, seriesSlug],
      );
      const sourceRecordId = await sourceRecord(connection, sourceId, model);

      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current CLAAS United States JAGUAR forage harvester lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current CLAAS US JAGUAR specification',TRUE,?,'Current CLAAS US forage-harvester data captured 2026-08-31. Values not exposed by the current US product pages remain unpublished rather than copied from another regional specification table.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Self-propelled forage harvester');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('engine.model'), sourceRecordId, model.engineModel);
      await put(connection, machineId, versionId, def('engine.cylinder_arrangement'), sourceRecordId, model.cylinderArrangement);
      if (model.maximumHp !== undefined) {
        await put(connection, machineId, versionId, def('engine.ece_r120_max_power'), sourceRecordId, model.maximumHp, 'hp');
      }
      await put(connection, machineId, versionId, def('forage.knife_drum_type'), sourceRecordId, model.knifeDrum);

      if (model.series === 'JAGUAR 900') {
        await put(connection, machineId, versionId, def('forage.crop_flow_system'), sourceRecordId, 'JAGUAR 900 crop flow with V-FLEX/V-MAX chopping-cylinder configurations');
        await put(connection, machineId, versionId, def('forage.automation'), sourceRecordId, 'CEMOS AUTO PERFORMANCE; AUTO FILL; CEMOS AUTO CROP FLOW availability described for the current JAGUAR 900 series');
        await put(connection, machineId, versionId, def('forage.front_attachment_options'), sourceRecordId, 'ORBIS corn headers, PICK UP grass pickups, and DIRECT DISC whole-crop attachments');
        await put(connection, machineId, versionId, def('forage.orbis_working_width'), sourceRecordId, 'Current JAGUAR 900/800 ORBIS family: 4.48-7.45 m');
        await put(connection, machineId, versionId, def('forage.kernel_processor_options'), sourceRecordId, 'MCC CLASSIC, MCC MAX, and MCC SHREDLAGE configurations described by CLAAS US');
      } else {
        await put(connection, machineId, versionId, def('forage.crop_flow_system'), sourceRecordId, '36 in (910 mm) wide V-FLEX chopping cylinder with 20% wider crop flow than JAGUAR 990 comparison baseline');
        await put(connection, machineId, versionId, def('forage.automation'), sourceRecordId, 'CEMOS AUTO CROP FLOW and CEMOS AUTO PERFORMANCE');
        await put(connection, machineId, versionId, def('forage.front_attachment_options'), sourceRecordId, 'New JAGUAR 1000 ORBIS corn headers and PICK UP grass pickups');
        await put(connection, machineId, versionId, def('forage.orbis_working_width'), sourceRecordId, '29.50-35.00 ft');
        await put(connection, machineId, versionId, def('forage.pickup_working_width'), sourceRecordId, '11.90-14.50 ft');
        await put(connection, machineId, versionId, def('forage.kernel_processor_options'), sourceRecordId, 'MULTI CROP CRACKER XL with rollers up to 310 mm');
      }
    }
  },
};
