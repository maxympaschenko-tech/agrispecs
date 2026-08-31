import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/titan-series-floaters';
const LIQUID_URL = `${FAMILY_URL}/610-liquid-system`;
const AIR_URL = `${FAMILY_URL}/fa-1030-air-boom-applicator`;

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'application_system.compatible_chassis', 'Compatible chassis', 'text', null, 10],
  ['Liquid Application System', 'liquid_system.tank_capacity', 'Tank capacity', 'decimal', 'gal', 10],
  ['Liquid Application System', 'liquid_system.tank_material', 'Tank construction', 'text', null, 20],
  ['Liquid Application System', 'liquid_system.boom_width_source_note', 'Published boom-width specification', 'text', null, 30],
  ['Liquid Application System', 'liquid_system.pump', 'Product pump', 'text', null, 40],
  ['Liquid Application System', 'liquid_system.rate_control', 'Rate control', 'text', null, 50],
  ['Liquid Application System', 'liquid_system.rinse_system', 'Rinse system', 'text', null, 60],
  ['Dry Application System', 'air_boom.total_struck_capacity', 'Total struck capacity', 'text', null, 10],
  ['Dry Application System', 'air_boom.micro_bin_capacity', 'Micro-bin capacity', 'text', null, 20],
  ['Dry Application System', 'air_boom.boom_widths', 'Boom widths', 'text', null, 30],
  ['Dry Application System', 'air_boom.max_application_rate', 'Published application capability', 'text', null, 40],
  ['Dry Application System', 'air_boom.deflector_plates', 'Deflector plates', 'text', null, 50],
  ['Dry Application System', 'air_boom.bin_configurations', 'Bin configurations', 'text', null, 60],
  ['Precision Technology', 'application_system.controller', 'Application controller', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Titan application-system migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, rawReference: unknown) {
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

export const caseIhTitanApplicationSystemsCurrentMigration: DbMigration = {
  id: '20260831_536_case_ih_titan_application_systems_current',
  description: 'Add current Case IH US 610 Liquid System and FA 1030 Air Boom Applicator',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Application System','application-system') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='application-system' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const familyRecordId = await record(
      connection,
      sourceId,
      'case-ih-titan-application-systems-family-us-current-2026-08',
      FAMILY_URL,
      'Case IH Titan current US application-system family information',
      { captured: '2026-08-31', market: 'United States', equipmentType: 'Application System', viper4Plus: 'Available for FA 1030 Air Boom Applicator and 610 Liquid System' },
    );
    const liquidRecordId = await record(
      connection,
      sourceId,
      'case-ih-610-liquid-system-us-current-2026-08',
      LIQUID_URL,
      'Case IH 610 Liquid System current US specifications',
      {
        captured: '2026-08-31', market: 'United States', equipmentType: 'Application System', model: '610 Liquid System',
        tankCapacityGal: 2000, tankMaterial: '12-gauge 304 stainless steel',
        boomDiscrepancy: { productSummary: '60/85 ft', boomSection: '65/85 ft' },
        pump: 'Defco 7600 hydraulically controlled pump', rateControl: 'PWM controls pump speed', rinse: 'Optional fresh water rinse system',
      },
    );
    const airRecordId = await record(
      connection,
      sourceId,
      'case-ih-fa-1030-air-boom-us-current-2026-08',
      AIR_URL,
      'Case IH FA 1030 Air Boom Applicator current US specifications',
      {
        captured: '2026-08-31', market: 'United States', equipmentType: 'Application System', model: 'FA 1030 Air Boom Applicator',
        compatibleChassis: ['Titan 3540', 'Titan 4540'], totalStruckCapacity: '320 - 350 cu ft', microBin: '35 - 55 cu ft',
        boomWidths: '72 or 90 ft stainless steel', applicationCapability: 'Up to 1,200 lb/ac at 10 mph', deflectorPlates: '32 on 72-ft boom; 37 on 90-ft boom',
        binConfigurations: 'Single-bin; single with micro-bin; double-bin; triple-bin',
      },
    );

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
      if (!value) throw new Error(`Missing Titan application-system definition ${key}`);
      return value;
    };

    const models = [
      { model: '610 Liquid System', slug: '610-liquid-system', recordId: liquidRecordId, configuration: 'Titan liquid application system' },
      { model: 'FA 1030 Air Boom Applicator', slug: 'fa-1030-air-boom-applicator', recordId: airRecordId, configuration: 'Titan dry air-boom application system' },
    ];
    for (const model of models) {
      await connection.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, model.model, model.slug],
      );
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States Titan application system','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current Case IH US application-system page captured 2026-08-31. Chassis specifications are intentionally not duplicated as application-system properties.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, model.configuration, model.recordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), model.recordId, model.configuration);
      await put(connection, machineId, versionId, def('configuration.market_scope'), model.recordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('application_system.controller'), familyRecordId, 'Viper 4+ controller available');

      if (model.slug === '610-liquid-system') {
        await put(connection, machineId, versionId, def('application_system.compatible_chassis'), familyRecordId, 'Titan Series floater chassis; current family page does not limit this system to a specific Titan model in the displayed copy');
        await put(connection, machineId, versionId, def('liquid_system.tank_capacity'), liquidRecordId, 2000, 'gal');
        await put(connection, machineId, versionId, def('liquid_system.tank_material'), liquidRecordId, '12-gauge 304 stainless steel');
        await put(connection, machineId, versionId, def('liquid_system.boom_width_source_note'), liquidRecordId, 'Manufacturer-page discrepancy: product summary states 60/85 ft; boom section states 65/85 ft. No single value is normalized here.');
        await put(connection, machineId, versionId, def('liquid_system.pump'), liquidRecordId, 'Defco 7600 hydraulically controlled pump');
        await put(connection, machineId, versionId, def('liquid_system.rate_control'), liquidRecordId, 'Pulse Width Modulation (PWM) controls product-pump speed');
        await put(connection, machineId, versionId, def('liquid_system.rinse_system'), liquidRecordId, 'Optional fresh water rinse system');
      } else {
        await put(connection, machineId, versionId, def('application_system.compatible_chassis'), airRecordId, 'Titan 3540 or Titan 4540');
        await put(connection, machineId, versionId, def('air_boom.total_struck_capacity'), airRecordId, '320 - 350 cu ft depending on boom size');
        await put(connection, machineId, versionId, def('air_boom.micro_bin_capacity'), airRecordId, '35 - 55 cu ft depending on boom size and bin selection');
        await put(connection, machineId, versionId, def('air_boom.boom_widths'), airRecordId, '72 or 90 ft stainless steel');
        await put(connection, machineId, versionId, def('air_boom.max_application_rate'), airRecordId, 'Up to 1,200 lb/ac total product at 10 mph');
        await put(connection, machineId, versionId, def('air_boom.deflector_plates'), airRecordId, '32 on 72-ft boom; 37 on 90-ft boom');
        await put(connection, machineId, versionId, def('air_boom.bin_configurations'), airRecordId, 'Single-bin; single with micro-bin; double-bin; triple-bin');
      }
    }
  },
};
