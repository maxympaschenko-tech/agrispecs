import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; powerHp: number; torqueFtLb: number; weightKg: number };

const VERSION = 'united-states-current-2026-08';
const PRODUCT_URL = 'https://www.fendt.com/us/products/tractors/fendt-900-vario';
const TECH_URL = 'https://api.fendt.com/techdata/US/en/1153774';
const models: Seed[] = [
  { slug: '930-vario-gen7', name: '930 Vario', powerHp: 296, torqueFtLb: 1143.2, weightKg: 11300 },
  { slug: '933-vario-gen7', name: '933 Vario', powerHp: 326, torqueFtLb: 1217.0, weightKg: 11300 },
  { slug: '936-vario-gen7', name: '936 Vario', powerHp: 355, torqueFtLb: 1290.7, weightKg: 11400 },
  { slug: '939-vario-gen7', name: '939 Vario', powerHp: 385, torqueFtLb: 1364.5, weightKg: 11400 },
  { slug: '942-vario-gen7', name: '942 Vario', powerHp: 415, torqueFtLb: 1453.0, weightKg: 11780 },
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('Fendt 900 Vario dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const fendt900VarioGen7CurrentUsMigration: DbMigration = {
  id: '20260830_316_fendt_900_vario_gen7_current_us',
  description: 'Add five current US Fendt 900 Vario Gen7 tractors from official Fendt US product and technical data',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='fendt' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Fendt' AND domain='fendt.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'Fendt 900 Vario Gen7','fendt-900-vario-gen7')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='fendt-900-vario-gen7' LIMIT 1`, [manufacturerId]);

    const productSource = await source(c, sourceId, 'fendt-900-vario-gen7-current-us-product-2026-08', PRODUCT_URL, 'Fendt US 900 Vario current product page', {
      market: 'United States', captured: '2026-08-30', models: models.map((m) => m.name), drivetrain: 'Fendt VarioDrive', hydraulicCombinedLMin: 430,
    });
    const techSource = await source(c, sourceId, 'fendt-900-vario-gen7-current-us-tech-2026-08', TECH_URL, 'Fendt US 900 Vario official technical data', {
      market: 'United States', captured: '2026-08-30', displacementL: 9.037, ratedSpeedRpm: 1700, fuelL: 625, adBlueL: 70,
      aftertreatment: 'DOC/DPF/SCR', transmission: 'TA 300', pto: '540E/1000', hydraulicCombinedLMin: 430, rearLiftDaN: 12410, wheelbaseMm: 3150,
      models,
    });

    const defs: Array<[string, string, string, string, string | null, number]> = [
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
      ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 4],
      ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 5],
      ['Engine', 'engine.maximum_torque', 'Maximum engine torque', 'decimal', 'ft-lb', 7],
      ['Engine', 'emissions.aftertreatment', 'Exhaust aftertreatment', 'text', null, 20],
      ['Transmission', 'transmission.options', 'Transmission / drivetrain', 'text', null, 10],
      ['PTO', 'pto.speeds', 'PTO speeds', 'text', null, 10],
      ['Hydraulics', 'hydraulics.main_pump_max_flow', 'Maximum hydraulic flow', 'decimal', 'US gal/min', 10],
      ['Hydraulics', 'hitch.rear_max_lift_capacity', 'Maximum rear hitch lift capacity', 'decimal', 'lb', 20],
      ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
      ['Capacities', 'capacities.adblue_tank', 'AdBlue tank capacity', 'decimal', 'L', 20],
      ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 10],
      ['Dimensions & Weight', 'dimensions.unladen_weight', 'Unladen weight', 'decimal', 'lb', 20],
    ];
    const definitions = new Map<string, number>();
    for (const row of defs) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitions.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const model of models) {
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Fendt 900 Vario Gen7 wheeled tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Fendt 900 Vario Gen7',TRUE,?,'Current US Fendt 900 Vario record. The US product page and US technical-data endpoint agree on the current five-model lineup and model-specific power values.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, productSource],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null, number]> = [
        ['engine.displacement', 9.037, 'L', techSource],
        ['engine.rated_power', model.powerHp, 'hp', techSource],
        ['engine.maximum_power', model.powerHp, 'hp', techSource],
        ['engine.maximum_torque', model.torqueFtLb, 'ft-lb', techSource],
        ['emissions.aftertreatment', 'DOC / DPF / SCR', null, techSource],
        ['transmission.options', 'TA 300 / Fendt VarioDrive', null, productSource],
        ['pto.speeds', '540E / 1000 rpm; optional 1000 / 1000E rpm', null, techSource],
        ['hydraulics.main_pump_max_flow', 113.6, 'US gal/min', techSource],
        ['hitch.rear_max_lift_capacity', 27899, 'lb', techSource],
        ['capacities.fuel_tank', 625, 'L', techSource],
        ['capacities.adblue_tank', 70, 'L', techSource],
        ['dimensions.wheelbase', 124.0, 'in', techSource],
        ['dimensions.unladen_weight', Math.round(model.weightKg * 2.2046226218), 'lb', techSource],
      ];
      for (const [key, value, unit, sourceRecordId] of values) {
        await put(c, machineId, versionId, definitions.get(key)!, sourceRecordId, value, unit);
      }
    }
  },
};
