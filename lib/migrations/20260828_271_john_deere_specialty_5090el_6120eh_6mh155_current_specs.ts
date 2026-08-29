import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = {
  slug: string;
  model: string;
  seriesSlug: string;
  seriesName: string;
  application: string;
  station: string;
  ratedHp: number;
  maxHp?: number;
  ipmHp?: number;
  ptoHp?: number;
  engineModel?: string;
  displacementL?: number;
  transmission?: string;
  hydraulicFlow?: number;
  drive?: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.deere.com/en/tractors/specialty-tractors/5090gn-narrow-series-tractor/';
const PRICEBOOK_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_6000s_WITH%20ALDI_05Nov2025.pdf';

const models: Model[] = [
  {
    slug: '5090el', model: '5090EL', seriesSlug: '5el-series', seriesName: '5EL Series',
    application: 'Low-profile specialty', station: 'Open Operator Station', ratedHp: 90, ptoHp: 75,
    hydraulicFlow: 85.17176514, drive: 'Manual Four Wheel Drive',
  },
  {
    slug: '6120eh', model: '6120EH', seriesSlug: '6eh-series', seriesName: '6EH Series',
    application: 'High-crop specialty', station: 'Open Operator Station; cab option', ratedHp: 120, ptoHp: 102,
    engineModel: 'John Deere PowerTech PWL', displacementL: 4.5,
    transmission: '12F/12R PowrReverser with creeper-capable specialty configuration',
    hydraulicFlow: 75.7, drive: 'MFWD',
  },
  {
    slug: '6mh-155', model: '6MH 155', seriesSlug: '6mh-series', seriesName: '6MH Series',
    application: 'High-clearance specialty', station: 'Cab', ratedHp: 155, maxHp: 171, ipmHp: 20,
    engineModel: 'John Deere PowerTech PVS', displacementL: 6.8,
    transmission: 'AutoQuad, PowrQuad, or AutoPowr/IVT depending on configuration',
    hydraulicFlow: 114, drive: 'Wheel',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere specialty 5090EL/6120EH/6MH155 dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, publishedDate: string | null = null) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,published_date) VALUES(?,?,?,?,?)`,
    [sourceId,url,externalId,title,publishedDate],
  );
  return Number(result.insertId);
}

export const johnDeereSpecialty5090EL6120EH6MH155CurrentSpecsMigration: DbMigration = {
  id: '20260828_271_john_deere_specialty_5090el_6120eh_6mh155_current_specs',
  description: 'Add current official US John Deere 5090EL, 6120EH and 6MH 155 specialty tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' LIMIT 1`);
    const familySourceId = await ensureSourceRecord(c,sourceId,'john-deere-specialty-tractors-current-us-2026-08',FAMILY_URL,'John Deere US Specialty Tractors - current lineup');
    const pricebookSourceId = await ensureSourceRecord(c,sourceId,'john-deere-6000s-pricebook-2025-11-05',PRICEBOOK_URL,'John Deere 6000 Series North America price book - 5 November 2025','2025-11-05');

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.application','Application','text',null,1],
      ['Machine Configuration','configuration.station','Operator station','text',null,2],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,3],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Engine','engine.ipm_additional_power','Additional IPM power','decimal','hp',18],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
      ['Hydraulics','hydraulics.pump_rated_output','Hydraulic pump output','decimal','L/min',10],
    ];
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
    }

    for (const m of models) {
      await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId,m.seriesName,m.seriesSlug]);
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId,equipmentTypeId,m.seriesSlug]);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US John Deere specialty tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current model status uses Deere US Specialty Tractors. Detailed 6120EH and 6MH 155 base-machine facts are cross-checked against Deere North America price-book data.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,m.station,familySourceId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const values: Array<[string,string|number,string|null,number]> = [
        ['configuration.application',m.application,null,familySourceId],
        ['configuration.station',m.station,null,familySourceId],
        ['engine.rated_power',m.ratedHp,'hp',familySourceId],
      ];
      if (m.drive) values.push(['configuration.drive',m.drive,null,familySourceId]);
      if (m.maxHp !== undefined) values.push(['engine.maximum_power',m.maxHp,'hp',familySourceId]);
      if (m.ipmHp !== undefined) values.push(['engine.ipm_additional_power',m.ipmHp,'hp',familySourceId]);
      if (m.ptoHp !== undefined) values.push(['pto.rated_power',m.ptoHp,'hp',familySourceId]);
      if (m.engineModel) values.push(['engine.model',m.engineModel,null,m.slug==='6mh-155'?familySourceId:pricebookSourceId]);
      if (m.displacementL !== undefined) values.push(['engine.displacement',m.displacementL,'L',pricebookSourceId]);
      if (m.transmission) values.push(['transmission.options',m.transmission,null,m.slug==='6mh-155'?familySourceId:pricebookSourceId]);
      if (m.hydraulicFlow !== undefined) values.push(['hydraulics.pump_rated_output',m.hydraulicFlow,'L/min',m.slug==='5090el'?familySourceId:pricebookSourceId]);
      for (const [key,value,unit,recordId] of values) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,defId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,recordId]);
      }
    }
  },
};
