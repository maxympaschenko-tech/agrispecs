import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; grossHp: number; ptoHp: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t4fv';
const models: Model[] = [
  { slug: 't4-80v', model: 'T4.80V', grossHp: 74, ptoHp: 65 },
  { slug: 't4-90v', model: 'T4.90V', grossHp: 84, ptoHp: 75 },
  { slug: 't4-100v', model: 'T4.100V', grossHp: 98, ptoHp: 88 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland T4V dependency missing');
  return Number(rows[0].id);
}

export const newHollandT4VCurrentSpecsMigration: DbMigration = {
  id: '20260829_296_new_holland_t4v_current_specs',
  description: 'Add current visible North America New Holland T4.80V, T4.90V and T4.100V vineyard tractor specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'T4V Vineyard Series','t4v-vineyard-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='t4v-vineyard-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const externalId = 'new-holland-t4v-visible-current-nar-2026-08';
    let [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = rows[0]?.id ? Number(rows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America T4V current visible models and specifications', JSON.stringify({ models, minimumWidthIn: 43.1, engines: 'F34/F36 four-cylinder FPT Industrial', emissions: 'Tier 4B Final', serviceIntervalHours: 600, station: 'Open platform or Blue Cab options' })],
      );
      sourceRecordId = Number(result.insertId);
    }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.application','Application','text',null,1],
      ['Machine Configuration','configuration.station','Operator station','text',null,2],
      ['Engine','engine.family','Engine family','text',null,5],
      ['Engine','engine.cylinders','Cylinders','integer',null,6],
      ['Engine','engine.gross_power','Gross engine horsepower','decimal','hp',10],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Engine','engine.service_interval','Engine oil service interval','decimal','h',60],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO horsepower','decimal','hp',10],
      ['Dimensions & Weight','dimensions.minimum_overall_width','Minimum overall width','decimal','in',10],
    ];
    for (const def of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, def);
    }

    for (const model of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current visible North America New Holland vineyard tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','T4V vineyard tractor',TRUE,?,'Only vineyard models explicitly visible on the current New Holland North America page are stored.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.application','Vineyard and narrow-row specialty work',null],
        ['configuration.station','Open platform or Blue Cab options',null],
        ['engine.family','F34/F36 FPT Industrial',null],
        ['engine.cylinders',4,null],
        ['engine.gross_power',model.grossHp,'hp'],
        ['engine.emissions','Tier 4B Final',null],
        ['engine.service_interval',600,'h'],
        ['transmission.options','Modular transmission family with Powershuttle, Dual Command Hi-Lo, Power Clutch, park lock and creeper options depending on configuration',null],
        ['pto.rated_power',model.ptoHp,'hp'],
        ['dimensions.minimum_overall_width',43.1,'in'],
      ];
      for (const [key, value, unit] of values) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, defId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
      }
    }
  },
};
