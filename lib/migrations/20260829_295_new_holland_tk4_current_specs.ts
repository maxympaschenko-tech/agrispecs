import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; grossHp: number; ptoHp: number; tracks: string; implementFlow: number; steeringFlow: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/tk4';
const models: Model[] = [
  { slug: 'tk4-80v', model: 'TK4.80V', grossHp: 74, ptoHp: 65, tracks: 'Steel', implementFlow: 35.5, steeringFlow: 20.4 },
  { slug: 'tk4-80f', model: 'TK4.80F', grossHp: 74, ptoHp: 65, tracks: 'SmartTrax rubber', implementFlow: 35.5, steeringFlow: 20.4 },
  { slug: 'tk4-100', model: 'TK4.100', grossHp: 98, ptoHp: 86, tracks: 'Steel', implementFlow: 45, steeringFlow: 22 },
  { slug: 'tk4-100m', model: 'TK4.100M', grossHp: 98, ptoHp: 86, tracks: 'Steel or SmartTrax rubber', implementFlow: 45, steeringFlow: 22 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland TK4 dependency missing');
  return Number(rows[0].id);
}

export const newHollandTK4CurrentSpecsMigration: DbMigration = {
  id: '20260829_295_new_holland_tk4_current_specs',
  description: 'Add current North America New Holland TK4.80V, TK4.80F, TK4.100 and TK4.100M crawler tractor specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'TK4 Crawler Series','tk4-crawler-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='tk4-crawler-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const externalId = 'new-holland-tk4-current-nar-2026-08';
    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America TK4 Crawler current specifications', JSON.stringify({ models, emissions: 'Stage V', engine: 'FPT Industrial', transmission: '8x8 standard; 16x8 with creeper available' })],
      );
      sourceRecordId = Number(result.insertId);
    }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.running_gear','Running gear','text',null,3],
      ['Engine','engine.manufacturer','Engine manufacturer','text',null,5],
      ['Engine','engine.gross_power','Gross engine horsepower','decimal','hp',10],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO horsepower','decimal','hp',10],
      ['Hydraulics','hydraulics.implement_pump_flow','Implement pump flow','decimal','L/min',20],
      ['Hydraulics','hydraulics.steering_pump_flow','Steering and services pump flow','decimal','L/min',30],
    ];
    for (const def of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, def);
    }

    for (const model of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America New Holland crawler specialty tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','TK4 crawler specialty tractor',TRUE,?,'Current New Holland North America product data.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.running_gear',model.tracks,null],
        ['engine.manufacturer','FPT Industrial',null],
        ['engine.gross_power',model.grossHp,'hp'],
        ['engine.emissions','Stage V',null],
        ['transmission.options','Standard 8x8; optional 16x8 with creeper',null],
        ['pto.rated_power',model.ptoHp,'hp'],
        ['hydraulics.implement_pump_flow',model.implementFlow,'L/min'],
        ['hydraulics.steering_pump_flow',model.steeringFlow,'L/min'],
      ];
      for (const [key, value, unit] of values) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, defId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
      }
    }
  },
};
