import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp?: number;
  ptoHp?: number;
  engineModel?: string;
  transmission?: string;
  pump?: number;
  url: string;
  externalId: string;
  sourceNote: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  {
    slug: '6m-110-oos', model: '6M 110 Open Operator Station', ratedHp: 110, maxHp: 121, ptoHp: 84,
    engineModel: 'John Deere PowerTech EWL',
    transmission: 'Standard: John Deere 16-speed PowrQuad 19 mph (30 km/h); optional 16-speed PowrQuad 24 mph (38 km/h) or 24-speed PowrQuad 25 mph (40 km/h); creeper available',
    pump: 80,
    url: 'https://www.deere.com/en/tractors/utility-tractors/6-family-utility-tractors/',
    externalId: 'john-deere-6m-110-oos-current-us-2026-08',
    sourceNote: 'Current US 6 Series family comparison plus current official OOS price-page confirmation.'
  },
  {
    slug: '6m-120-oos', model: '6M 120 Open Operator Station', ratedHp: 120, maxHp: 132, ptoHp: 93,
    engineModel: 'John Deere PowerTech 4045 EWL',
    transmission: 'Standard: John Deere 16-speed PowrQuad 19 mph (30 km/h); optional 16-speed PowrQuad 24 mph (38 km/h) or 24-speed PowrQuad 25 mph (40 km/h); creeper available',
    pump: 80,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-120-tractor-njaznkw',
    externalId: 'john-deere-6m-120-oos-current-us-2026-08',
    sourceNote: 'Current US product page and 6 Series family comparison.'
  },
  {
    slug: '6m-130-oos', model: '6M 130 Open Operator Station', ratedHp: 130,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-130-open-operator-station-tractor-nja1nkw',
    externalId: 'john-deere-6m-130-oos-current-us-2026-08',
    sourceNote: 'Current US individual product page confirms the OOS model; only the explicitly published rated family horsepower is stored here.'
  },
  {
    slug: '6m-145-oos', model: '6M 145 Open Operator Station', ratedHp: 143, maxHp: 157,
    engineModel: 'John Deere PowerTech 4045 PWS',
    transmission: 'Standard: PowrReverser 12F/12R; optional PowrReverser 24F/12R',
    pump: 94,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-145-open-operator-station-tractor-nje5nkw',
    externalId: 'john-deere-6m-145-oos-current-us-2026-08',
    sourceNote: 'Current US individual OOS product page.'
  },
  {
    slug: '6m-155-oos', model: '6M 155 Open Operator Station', ratedHp: 153, maxHp: 168,
    engineModel: 'John Deere PowerTech 4045 EWL',
    transmission: 'PowrQuad PLUS 16F/16R; optional Powr8 32F/16R or Powr8 32F/16R with creeper',
    pump: 97,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-155-open-operator-station-tractor-nja4nkw',
    externalId: 'john-deere-6m-155-oos-current-us-2026-08',
    sourceNote: 'Current US individual OOS product page.'
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6M OOS dependency missing');
  return Number(rows[0].id);
}

async function sourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Model) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [m.externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, m.url, m.externalId, `John Deere US ${m.model} official current specifications`, JSON.stringify(m)],
  );
  return Number(result.insertId);
}

export const johnDeere6MOOSCurrentSpecsMigration: DbMigration = {
  id: '20260828_265_john_deere_6m_oos_current_specs',
  description: 'Add current official US John Deere 6M Open Operator Station models as separate machine records',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'6M Open Operator Station','6m-oos-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='6m-oos-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,2],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
      ['Hydraulics','hydraulics.pump_rated_output','Standard pump rated output','decimal','L/min',10],
    ];
    for (const d of defs) await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);

    for (const m of models) {
      const sr = await sourceRecord(c, sourceId, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US John Deere 6M Open Operator Station tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Open Operator Station',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,sr,m.sourceNote]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const vals: Array<[string,string|number,string|null]> = [
        ['configuration.station','Open Operator Station',null], ['configuration.drive','Wheel',null], ['engine.rated_power',m.ratedHp,'hp'],
      ];
      if (m.maxHp !== undefined) vals.push(['engine.maximum_power',m.maxHp,'hp']);
      if (m.ptoHp !== undefined) vals.push(['pto.rated_power',m.ptoHp,'hp']);
      if (m.engineModel) vals.push(['engine.model',m.engineModel,null]);
      if (m.transmission) vals.push(['transmission.options',m.transmission,null]);
      if (m.pump !== undefined) vals.push(['hydraulics.pump_rated_output',m.pump,'L/min']);
      for (const [key,value,unit] of vals) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,defId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sr]);
      }
    }
  },
};
