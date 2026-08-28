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
  sourceUrl: string;
  externalId: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  {
    slug: '5075en', model: '5075EN', ratedHp: 75, maxHp: 75, ptoHp: 58,
    engineModel: 'John Deere PowerTech 4045 PWS',
    transmission: 'Standard: PowrReverser 12F/12R; optional PowrReverser 24F/12R',
    pump: 94,
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/tractors/high-value-crop-tractors/5075en-cab-narrow-tractor-mdzuula',
    externalId: 'john-deere-5075en-current-us-2026-08',
  },
  {
    slug: '5090en', model: '5090EN', ratedHp: 90,
    sourceUrl: 'https://www.deere.com/en/tractors/specialty-tractors/5090gn-narrow-series-tractor/',
    externalId: 'john-deere-5090en-current-us-2026-08',
  },
  {
    slug: '5105en', model: '5105EN', ratedHp: 105,
    sourceUrl: 'https://www.deere.com/en/tractors/specialty-tractors/5090gn-narrow-series-tractor/',
    externalId: 'john-deere-5105en-current-us-2026-08',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 5EN dependency missing');
  return Number(rows[0].id);
}

async function sourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Model) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [m.externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId,m.sourceUrl,m.externalId,`John Deere US ${m.model} official current specifications`,JSON.stringify(m)],
  );
  return Number(result.insertId);
}

export const johnDeere5ENCurrentSpecsMigration: DbMigration = {
  id: '20260828_270_john_deere_5en_current_specs',
  description: 'Add current official US John Deere 5075EN, 5090EN and 5105EN narrow tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'5EN Series','5en-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='5en-series' LIMIT 1`, [manufacturerId,equipmentTypeId]);

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.application','Application','text',null,1],
      ['Machine Configuration','configuration.station','Operator station','text',null,2],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,3],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
      ['Hydraulics','hydraulics.pump_rated_output','Standard pump rated output','decimal','L/min',10],
    ];
    for (const d of defs) await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);

    for (const m of models) {
      const sr = await sourceRecord(c,sourceId,m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US John Deere narrow specialty tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current 5EN narrow specialty tractor',TRUE,?,'Current model status and stored facts use official John Deere US specialty tractor pages captured August 2026.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,sr]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const vals: Array<[string,string|number,string|null]> = [
        ['configuration.application','Narrow orchard and vineyard',null],
        ['configuration.station','Cab or Open Operator Station',null],
        ['configuration.drive','MFWD',null],
        ['engine.rated_power',m.ratedHp,'hp'],
        ['engine.emissions','Final Tier 4',null],
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
