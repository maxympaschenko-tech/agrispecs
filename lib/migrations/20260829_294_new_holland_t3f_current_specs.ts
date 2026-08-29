import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; grossHp: number; ptoHp: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t3f-compact-specialty';
const models: Model[] = [
  { slug: 't3-60f', model: 'T3.60F', grossHp: 54, ptoHp: 40 },
  { slug: 't3-70f', model: 'T3.70F', grossHp: 64, ptoHp: 50 },
  { slug: 't3-80f', model: 'T3.80F', grossHp: 74, ptoHp: 60 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland T3F dependency missing');
  return Number(rows[0].id);
}

export const newHollandT3FCurrentSpecsMigration: DbMigration = {
  id: '20260829_294_new_holland_t3f_current_specs',
  description: 'Add current North America New Holland T3.60F, T3.70F and T3.80F compact specialty tractor specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'T3F Compact Specialty Series','t3f-compact-specialty-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='t3f-compact-specialty-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const externalId = 'new-holland-t3f-current-nar-2026-08';
    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America T3F Compact Specialty current specifications', JSON.stringify({ models, transmission: '12x12 mechanical shuttle', drive: '4WD front axle', emissions: 'EGR + DOC; no DPF or regeneration', minWidthIn: 57, steeringWheelHeightIn: 54, designWeightLb: 5000 })],
      );
      sourceRecordId = Number(result.insertId);
    }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.application','Application','text',null,1],
      ['Machine Configuration','configuration.station','Operator station','text',null,2],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,3],
      ['Engine','engine.gross_power','Gross engine horsepower','decimal','hp',10],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO horsepower','decimal','hp',10],
      ['Dimensions & Weight','dimensions.minimum_overall_width','Minimum overall width','decimal','in',10],
      ['Dimensions & Weight','dimensions.steering_wheel_height','Height to top of steering wheel','decimal','in',20],
      ['Dimensions & Weight','weight.design_weight','Published design weight','decimal','lb',30],
    ];
    for (const def of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, def);
    }

    for (const model of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America New Holland compact specialty tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','T3F compact specialty tractor',TRUE,?,'Current New Holland North America product data.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.application','Narrow, low-clearance specialty work',null],
        ['configuration.station','Straddle-deck open operator platform',null],
        ['configuration.drive','4WD',null],
        ['engine.gross_power',model.grossHp,'hp'],
        ['engine.emissions','EGR + DOC; no DPF; no regeneration',null],
        ['transmission.options','12x12 mechanical shuttle',null],
        ['pto.rated_power',model.ptoHp,'hp'],
        ['dimensions.minimum_overall_width',57,'in'],
        ['dimensions.steering_wheel_height',54,'in'],
        ['weight.design_weight',5000,'lb'],
      ];
      for (const [key, value, unit] of values) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, defId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
      }
    }
  },
};
