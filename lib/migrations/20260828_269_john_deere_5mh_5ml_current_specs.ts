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
  ptoHp: number;
  engineModel: string;
  displacementL: number;
  transmission: string;
  pumpStandard: number;
  pumpOptional?: number;
  sourceUrl: string;
  externalId: string;
};

const VERSION = 'united-states-current-2026-08';
const PRICEBOOK_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_GSA_5000ENs%20GLs%20GNs%20GVs%20MHs%20MLs%2005May2026.pdf';

const models: Model[] = [
  {
    slug: '5105mh',
    model: '5105MH',
    seriesSlug: '5mh-series',
    seriesName: '5MH Series',
    application: 'High-Crop Specialty',
    station: 'Open Operator Station; cab optional',
    ratedHp: 105,
    ptoHp: 90,
    engineModel: 'John Deere PowerTech 4045',
    displacementL: 4.5,
    transmission: 'Creeper-capable specialty tractor transmission; exact factory transmission selection varies by configuration',
    pumpStandard: 94,
    sourceUrl: PRICEBOOK_URL,
    externalId: 'john-deere-5105mh-current-us-2026-08',
  },
  {
    slug: '5105ml',
    model: '5105ML',
    seriesSlug: '5ml-series',
    seriesName: '5ML Series',
    application: 'Low-Profile Specialty',
    station: 'Open Operator Station; cab option',
    ratedHp: 105,
    maxHp: 110,
    ptoHp: 90,
    engineModel: 'John Deere PowerTech 4045 PWS',
    displacementL: 4.5,
    transmission: 'PowrQuad PLUS 16F/16R; optional Powr8 32F/16R with creeper',
    pumpStandard: 117,
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/tractors/high-value-crop-tractors/5105ml-open-operator-station-low-profile-tractor-mtlbvva',
    externalId: 'john-deere-5105ml-current-us-2026-08',
  },
  {
    slug: '5120ml',
    model: '5120ML',
    seriesSlug: '5ml-series',
    seriesName: '5ML Series',
    application: 'Low-Profile Specialty',
    station: 'Open Operator Station; cab option',
    ratedHp: 120,
    maxHp: 125,
    ptoHp: 105,
    engineModel: 'John Deere PowerTech 4045 EWL',
    displacementL: 4.5,
    transmission: 'PowrReverser 16F/16R with creeper',
    pumpStandard: 94,
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/tractors/high-value-crop-tractors/5120ml-open-operator-station-low-profile-tractor-mjvbvva',
    externalId: 'john-deere-5120ml-current-us-2026-08',
  },
  {
    slug: '5130ml',
    model: '5130ML',
    seriesSlug: '5ml-series',
    seriesName: '5ML Series',
    application: 'Low-Profile Specialty',
    station: 'Open Operator Station; cab option',
    ratedHp: 130,
    maxHp: 136,
    ptoHp: 115,
    engineModel: 'John Deere PowerTech 4045 EWL',
    displacementL: 4.5,
    transmission: 'PowrReverser 16F/16R; optional PowrReverser Hi-Lo 32F/16R, PowrQuad PLUS 16F/16R, Powr8 32F/16R, or Powr8 32F/16R with creeper',
    pumpStandard: 94,
    pumpOptional: 97,
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/tractors/high-value-crop-tractors/5130ml-open-operator-station-low-profile-tractor-mju3vva',
    externalId: 'john-deere-5130ml-current-us-2026-08',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 5MH/5ML dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Model) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [m.externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId,m.sourceUrl,m.externalId,`John Deere US ${m.model} official current specifications`,JSON.stringify(m)],
  );
  return Number(result.insertId);
}

export const johnDeere5MH5MLCurrentSpecsMigration: DbMigration = {
  id: '20260828_269_john_deere_5mh_5ml_current_specs',
  description: 'Add current official US John Deere 5105MH and 5105ML/5120ML/5130ML specialty tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' LIMIT 1`);

    const definitions: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.application','Application','text',null,1],
      ['Machine Configuration','configuration.station','Operator station','text',null,2],
      ['Machine Configuration','configuration.drive','Drive configuration','text',null,3],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Engine','engine.aspiration','Aspiration','text',null,40],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
      ['Hydraulics','hydraulics.pump_rated_output','Standard pump rated output','decimal','L/min',10],
      ['Hydraulics','hydraulics.pump_optional_output','Optional pump rated output','decimal','L/min',20],
    ];
    for (const d of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        d,
      );
    }

    for (const m of models) {
      await c.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
         VALUES(?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId,equipmentTypeId,m.seriesName,m.seriesSlug],
      );
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId,equipmentTypeId,m.seriesSlug]);
      const sourceRecordId = await ensureSourceRecord(c,sourceId,m);

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US John Deere specialty tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Official John Deere US current specialty tractor data captured August 2026.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,VERSION,m.station,sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.application',m.application,null],
        ['configuration.station',m.station,null],
        ['configuration.drive','MFWD',null],
        ['engine.model',m.engineModel,null],
        ['engine.displacement',m.displacementL,'L'],
        ['engine.rated_power',m.ratedHp,'hp'],
        ['engine.emissions','Final Tier 4',null],
        ['engine.aspiration','Turbocharged',null],
        ['transmission.options',m.transmission,null],
        ['pto.rated_power',m.ptoHp,'hp'],
        ['hydraulics.pump_rated_output',m.pumpStandard,'L/min'],
      ];
      if (m.maxHp !== undefined) values.push(['engine.maximum_power',m.maxHp,'hp']);
      if (m.pumpOptional !== undefined) values.push(['hydraulics.pump_optional_output',m.pumpOptional,'L/min']);

      for (const [key,value,unit] of values) {
        const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(
          `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
           VALUES(?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId],
        );
      }
    }
  },
};
