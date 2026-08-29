import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; grossHp: number; ptoHp: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/workmaster-utility-55-75-series/workmaster-55';
const models: Model[] = [
  { slug: 'workmaster-55', model: 'WORKMASTER 55', grossHp: 54, ptoHp: 40 },
  { slug: 'workmaster-65', model: 'WORKMASTER 65', grossHp: 64, ptoHp: 50 },
  { slug: 'workmaster-75', model: 'WORKMASTER 75', grossHp: 74, ptoHp: 60 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland WORKMASTER 55-75 dependency missing');
  return Number(rows[0].id);
}

export const newHollandWorkmaster5575CurrentSpecsMigration: DbMigration = {
  id: '20260829_291_new_holland_workmaster_55_75_current_specs',
  description: 'Add current North America New Holland WORKMASTER 55, 65 and 75 utility tractor specifications',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'WORKMASTER Utility 55-75 Series','workmaster-utility-55-75-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='workmaster-utility-55-75-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const externalId = 'new-holland-workmaster-55-75-current-nar-2026-08';
    let [recordRows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America WORKMASTER Utility 55-75 Series current specifications', JSON.stringify({
          lineup: models,
          engine: '3-cylinder, 179 cu. in.',
          emissions: 'Tier 4B using DOC and EGR; no DPF and no regeneration',
          transmission: '12x12 power shuttle',
          rearPto: '540 rpm hydraulic PTO',
          hitchLiftLb: 3500,
        })],
      );
      sourceRecordId = Number(result.insertId);
    }

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Engine','engine.cylinders','Cylinders','integer',null,6],
      ['Engine','engine.gross_power','Gross engine horsepower','decimal','hp',10],
      ['Engine','engine.displacement_text','Engine displacement','text',null,20],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO horsepower','decimal','hp',10],
      ['PTO','pto.speed','Rear PTO speed','integer','rpm',20],
      ['Hydraulics','hitch.rear_lift_capacity','Rear three-point hitch lift capacity','decimal','lb',40],
    ];
    for (const def of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, def);
    }

    for (const model of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America New Holland WORKMASTER Utility 55-75 tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','WORKMASTER Utility 55-75 Series',TRUE,?,'Current New Holland North America product-family data.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['engine.cylinders', 3, null],
        ['engine.gross_power', model.grossHp, 'hp'],
        ['engine.displacement_text', '179 cu. in.', null],
        ['engine.emissions', 'Tier 4B; DOC and EGR; no DPF; no regeneration', null],
        ['transmission.options', '12x12 power shuttle', null],
        ['pto.rated_power', model.ptoHp, 'hp'],
        ['pto.speed', 540, 'rpm'],
        ['hitch.rear_lift_capacity', 3500, 'lb'],
      ];

      for (const [key, value, unit] of values) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, defId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
      }
    }
  },
};
