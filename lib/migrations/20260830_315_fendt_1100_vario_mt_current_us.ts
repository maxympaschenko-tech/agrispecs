import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; maxHp: number; displacementL: number };

const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.fendt.com/us/products/tractors/fendt-1100-vario-mt';
const models: Seed[] = [
  { slug: '1151-vario-mt', name: '1151 Vario MT', maxHp: 511, displacementL: 15.2 },
  { slug: '1156-vario-mt', name: '1156 Vario MT', maxHp: 564, displacementL: 15.2 },
  { slug: '1162-vario-mt', name: '1162 Vario MT', maxHp: 618, displacementL: 15.2 },
  { slug: '1167-vario-mt', name: '1167 Vario MT', maxHp: 673, displacementL: 16.2 },
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(q, p);
  if (!r[0]) throw new Error('Fendt 1100 Vario MT dependency missing');
  return Number(r[0].id);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const fendt1100VarioMtCurrentUsMigration: DbMigration = {
  id: '20260830_315_fendt_1100_vario_mt_current_us',
  description: 'Add four current US Fendt 1100 Vario MT tractors from the official Fendt US product page',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='fendt' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Fendt' AND domain='fendt.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'Fendt 1100 Vario MT','fendt-1100-vario-mt')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='fendt-1100-vario-mt' LIMIT 1`, [manufacturerId]);

    const externalId = 'fendt-1100-vario-mt-current-us-2026-08';
    const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
    if (!sourceRecordId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, URL, externalId, 'Fendt US 1100 Vario MT current specifications', JSON.stringify({
          market: 'United States',
          captured: '2026-08-30',
          models,
          drivetrain: 'Fendt VarioDrive continuously variable drivetrain',
          drive: 'tracked tractor',
          hydraulicMaxLMin: 440,
          hydraulicMaintenanceInterval: '2,000 hours or two years',
          wheelbaseIn: 118,
        })],
      );
      sourceRecordId = Number(inserted.insertId);
    }

    const defs: Array<[string, string, string, string, string | null, number]> = [
      ['Machine Configuration', 'configuration.drive', 'Drive configuration', 'text', null, 2],
      ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
      ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 5],
      ['Transmission', 'transmission.options', 'Transmission / drivetrain', 'text', null, 10],
      ['Hydraulics', 'hydraulics.main_pump_max_flow', 'Maximum hydraulic flow', 'decimal', 'US gal/min', 10],
      ['Hydraulics', 'hydraulics.maintenance_interval', 'Hydraulic maintenance interval', 'text', null, 30],
      ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 10],
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
         VALUES(?,?,?,?,?,'Current US Fendt 1100 Vario MT tracked tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Fendt 1100 Vario MT',TRUE,?,'Current US record using only values explicitly published by the linked Fendt US product page.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.drive', 'Tracked undercarriage', null],
        ['engine.make', 'MAN', null],
        ['engine.displacement', model.displacementL, 'L'],
        ['engine.maximum_power', model.maxHp, 'hp'],
        ['transmission.options', 'Fendt VarioDrive continuously variable drivetrain', null],
        ['hydraulics.main_pump_max_flow', 116.2, 'US gal/min'],
        ['hydraulics.maintenance_interval', '2,000 hours or two years', null],
        ['dimensions.wheelbase', 118, 'in'],
      ];
      for (const [key, value, unit] of values) {
        await put(c, machineId, versionId, definitions.get(key)!, sourceRecordId, value, unit);
      }
    }
  },
};
