import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp: number;
  ratedIpmHp: number;
  maxIpmHp: number;
  defTankL: number;
};

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  { slug:'6r-145', model:'6R 145', ratedHp:145, maxHp:160, ratedIpmHp:185, maxIpmHp:192, defTankL:16 },
  { slug:'6r-155', model:'6R 155', ratedHp:155, maxHp:171, ratedIpmHp:195, maxIpmHp:203, defTankL:16 },
  { slug:'6r-165', model:'6R 165', ratedHp:165, maxHp:182, ratedIpmHp:205, maxIpmHp:213, defTankL:16 },
  { slug:'6r-185', model:'6R 185', ratedHp:185, maxHp:204, ratedIpmHp:225, maxIpmHp:234, defTankL:16 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6R 145-185 dependency missing');
  return Number(rows[0].id);
}

export const johnDeere6R145185CurrentSpecsMigration: DbMigration = {
  id: '20260828_267_john_deere_6r_145_185_current_specs',
  description: 'Add May 2026 official John Deere 6R 145, 155, 165 and 185 current North America specifications',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceRecordId = await id(c, `SELECT id FROM source_records WHERE external_id='john-deere-6000s-pricebook-2026-05-05' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'6R Series','6r-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId,equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='6r-series' LIMIT 1`, [manufacturerId,equipmentTypeId]);

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['Engine','engine.model','Engine model','text',null,5],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.cylinders','Cylinders','integer',null,25],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.maximum_power','Maximum engine power','decimal','hp',15],
      ['Engine','engine.rated_power_ipm','Rated engine power with IPM','decimal','hp',17],
      ['Engine','engine.maximum_power_ipm','Maximum engine power with IPM','decimal','hp',18],
      ['Engine','engine.emissions','Emissions compliance','text',null,50],
      ['Capacities','capacities.def_tank','DEF tank capacity','decimal','L',20],
      ['Electrical','electrical.battery_system','Battery','text',null,10],
      ['Electrical','electrical.alternator','Alternator','text',null,20],
    ];
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
    }

    for (const m of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current 2026 North America John Deere 6R tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId,equipmentTypeId,seriesId,m.model,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current 6R cab tractor',TRUE,?,'Official John Deere North America 6000 Series price book dated 5 May 2026; United States destination is offered in the price book.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const vals: Array<[string,string|number,string|null]> = [
        ['configuration.station','Cab',null],
        ['engine.model','John Deere PowerTech PVS',null],
        ['engine.displacement',6.788,'L'],
        ['engine.cylinders',6,null],
        ['engine.rated_power',m.ratedHp,'hp'],
        ['engine.maximum_power',m.maxHp,'hp'],
        ['engine.rated_power_ipm',m.ratedIpmHp,'hp'],
        ['engine.maximum_power_ipm',m.maxIpmHp,'hp'],
        ['engine.emissions','Stage V compliant',null],
        ['capacities.def_tank',m.defTankL,'L'],
        ['electrical.battery_system','12 V / 174 A',null],
        ['electrical.alternator','14 V / 250 A',null],
      ];
      for (const [key,value,unit] of vals) {
        const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);
      }
    }
  },
};
