import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp: number;
  ptoHp: number;
  displacementL: number;
  engineModel: string;
  transmission: string;
  pumpStandard: number;
  pumpOptional?: number;
  url: string;
  externalId: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  {
    slug: '6m-165',
    model: '6M 165',
    ratedHp: 165,
    maxHp: 182,
    ptoHp: 125,
    displacementL: 6.8,
    engineModel: 'John Deere PowerTech PVS',
    transmission: '20-speed PowrQuad Plus standard; optional 16-speed PowrQuad Plus, 20-speed AutoQuad Plus, e19 PowerShift, or AutoPowr/IVT',
    pumpStandard: 114,
    pumpOptional: 155,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-165-tractor-njiwmuw',
    externalId: 'john-deere-6m-165-current-us-2026-08',
  },
  {
    slug: '6m-250',
    model: '6M 250',
    ratedHp: 250,
    maxHp: 275,
    ptoHp: 195,
    displacementL: 6.8,
    engineModel: 'John Deere PowerTech PSS',
    transmission: 'AutoPowr/IVT 40 km/h standard; optional AutoPowr/IVT 50 km/h or e19 PowerShift 40/50 km/h',
    pumpStandard: 155,
    pumpOptional: 210,
    url: 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-250-tractor-nje3muw',
    externalId: 'john-deere-6m-250-current-us-2026-08',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6M expansion dependency missing');
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

export const johnDeere6M165250CurrentSpecsMigration: DbMigration = {
  id: '20260828_263_john_deere_6m_165_250_current_specs',
  description: 'Add official current US John Deere 6M 165 and 6M 250 product-page specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'6M Series','6m-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='6m-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitions: Array<[string, string, string, string, string | null, number]> = [
      ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
      ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
      ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 15],
      ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
      ['Transmission', 'transmission.options', 'Transmission options', 'text', null, 20],
      ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
      ['Hydraulics', 'hydraulics.pump_rated_output', 'Standard pump rated output', 'decimal', 'L/min', 10],
      ['Hydraulics', 'hydraulics.pump_optional_output', 'Optional pump rated output', 'decimal', 'L/min', 20],
      ['Machine Configuration', 'configuration.drive', 'Drive configuration', 'text', null, 2],
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
      const sr = await sourceRecord(c, sourceId, m);
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US John Deere 6M utility tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, m.model, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current 6M utility tractor',TRUE,?,'Official John Deere US individual product page captured August 2026.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sr],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['engine.model', m.engineModel, null],
        ['engine.displacement', m.displacementL, 'L'],
        ['engine.rated_power', m.ratedHp, 'hp'],
        ['engine.maximum_power', m.maxHp, 'hp'],
        ['engine.emissions', 'Final Tier 4', null],
        ['transmission.options', m.transmission, null],
        ['pto.rated_power', m.ptoHp, 'hp'],
        ['hydraulics.pump_rated_output', m.pumpStandard, 'L/min'],
        ['configuration.drive', 'MFWD', null],
      ];
      if (m.pumpOptional !== undefined) values.push(['hydraulics.pump_optional_output', m.pumpOptional, 'L/min']);
      for (const [key, value, unit] of values) {
        const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(
          `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
           VALUES(?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sr],
        );
      }
    }
  },
};
