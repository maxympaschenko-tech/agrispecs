import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/trident-combination-applicator/trident-5550';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/trident-combination-applicator';
const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'trident.engine_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'trident.peak_power', 'Peak engine power', 'decimal', 'hp', 20],
  ['Application System', 'trident.application_type', 'Application type', 'text', null, 10],
  ['Application System', 'trident.changeover_time', 'Liquid/dry changeover time', 'text', null, 20],
  ['Application System', 'trident.seasons_of_use', 'Seasons of use', 'integer', null, 30],
  ['Application System', 'trident.liquid_tank_capacity', 'Maximum liquid tank capacity', 'decimal', 'gal', 40],
  ['Application System', 'trident.dry_spread_width', 'Maximum dry fertilizer spread width', 'decimal', 'ft', 50],
  ['Application System', 'trident.lime_spread_width', 'Maximum ag lime spread width', 'decimal', 'ft', 60],
  ['Application System', 'trident.multi_product', 'Multi-product capability', 'text', null, 70],
  ['Travel', 'trident.max_travel_speed', 'Maximum travel speed', 'decimal', 'mph', 10],
  ['Dimensions & Weight', 'trident.wheelbase', 'Wheelbase', 'text', null, 10],
  ['Transmission', 'trident.drive_system', 'Drive system', 'text', null, 10],
  ['Precision Technology', 'trident.precision_systems', 'Precision application systems', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Trident 5550 migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function ensureRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, rawReference: unknown) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseIhTrident5550CombinationApplicatorCurrentMigration: DbMigration = {
  id: '20260831_535_case_ih_trident_5550_combination_applicator_current',
  description: 'Add current Case IH US Trident 5550 liquid/dry combination applicator',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Combination Applicator','combination-applicator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='combination-applicator' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const modelRecordId = await ensureRecord(
      connection,
      sourceId,
      'case-ih-trident-5550-us-current-2026-08',
      URL,
      'Case IH Trident 5550 current US specifications',
      { captured: '2026-08-31', market: 'United States', equipmentType: 'Combination Applicator', model: 'Trident 5550', ratedHp: 390, peakHp: 415, maxTravelSpeedMph: 40, wheelbase: '14 ft 2 in', familySource: FAMILY_URL },
    );
    const familyRecordId = await ensureRecord(
      connection,
      sourceId,
      'case-ih-trident-family-us-current-2026-08',
      FAMILY_URL,
      'Case IH Trident current US combination applicator family specifications',
      {
        captured: '2026-08-31', market: 'United States', equipmentType: 'Combination Applicator',
        applicationType: 'Liquid and dry combination application', changeoverTime: '42 minutes', seasonsOfUse: 3,
        maxLiquidTankGal: 1600, maxDrySpreadWidthFt: 120, maxLimeSpreadWidthFt: 60,
        multiProduct: 'Up to four products with MultApplier and MultiBin options',
        drive: 'Hydrostatic drive with full-time 4WD and individual wheel traction control',
        precision: 'SenseApply MY2026, AIM Command FLEX II, AccuBoom, AutoBoom XRT, AIM AccuPlacer, RS1 autoguidance',
      },
    );

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Trident Combination Applicator','trident-combination-applicator') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='trident-combination-applicator' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Trident 5550 definition ${key}`);
      return value;
    };

    await connection.query(
      `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES(?,?,?,?,?,'Current Case IH United States Trident liquid/dry combination applicator','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId, equipmentTypeId, seriesId, 'Trident 5550', 'trident-5550'],
    );
    const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='trident-5550' LIMIT 1`, [manufacturerId, equipmentTypeId]);
    await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
    await connection.query(
      `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
       VALUES(?,?,'US','United States','Current Trident 5550 liquid/dry combination applicator',TRUE,?,'Current Case IH US model and family pages captured 2026-08-31. Dry-only Hi-Flow chassis details are not merged into the convertible liquid/dry record.')
       ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [machineId, VERSION, modelRecordId],
    );
    const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

    await put(connection, machineId, versionId, def('configuration.type'), modelRecordId, 'Self-propelled liquid/dry combination applicator');
    await put(connection, machineId, versionId, def('configuration.market_scope'), modelRecordId, 'United States current catalog');
    await put(connection, machineId, versionId, def('trident.engine_power'), familyRecordId, 390, 'hp');
    await put(connection, machineId, versionId, def('trident.peak_power'), modelRecordId, 415, 'hp');
    await put(connection, machineId, versionId, def('trident.application_type'), familyRecordId, 'Liquid and dry combination application');
    await put(connection, machineId, versionId, def('trident.changeover_time'), familyRecordId, '42 minutes');
    await put(connection, machineId, versionId, def('trident.seasons_of_use'), familyRecordId, 3);
    await put(connection, machineId, versionId, def('trident.liquid_tank_capacity'), familyRecordId, 1600, 'gal');
    await put(connection, machineId, versionId, def('trident.dry_spread_width'), familyRecordId, 120, 'ft');
    await put(connection, machineId, versionId, def('trident.lime_spread_width'), familyRecordId, 60, 'ft');
    await put(connection, machineId, versionId, def('trident.multi_product'), familyRecordId, 'Up to four products in one pass with MultApplier and MultiBin options');
    await put(connection, machineId, versionId, def('trident.max_travel_speed'), modelRecordId, 40, 'mph');
    await put(connection, machineId, versionId, def('trident.wheelbase'), modelRecordId, '14 ft 2 in');
    await put(connection, machineId, versionId, def('trident.drive_system'), familyRecordId, 'Hydrostatic drive; full-time 4WD; individual wheel traction control');
    await put(connection, machineId, versionId, def('trident.precision_systems'), familyRecordId, 'SenseApply (MY2026), AIM Command FLEX II, AccuBoom, AutoBoom XRT, AIM AccuPlacer and RS1 autoguidance');
  },
};
