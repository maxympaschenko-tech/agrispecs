import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; hp: number; ptoHp: number; transmissionNote: string };

const VERSION = 'united-states-current-2026-08';
const models: Model[] = [
  { slug:'5085m', model:'5085M', hp:85, ptoHp:70, transmissionNote:'PowrReverser, PowrQuad PLUS, or Powr8 configurations are offered depending on build.' },
  { slug:'5090m', model:'5090M', hp:90, ptoHp:75, transmissionNote:'PowrQuad PLUS 16F/16R or Powr8 32F/16R in the documented North America ALDI configuration; PowrReverser configuration is also listed in the price book.' },
  { slug:'5100m', model:'5100M', hp:101.45, ptoHp:85, transmissionNote:'PowrQuad PLUS 16F/16R or Powr8 32F/16R in the documented North America ALDI configuration.' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 5M 5085-5100 dependency missing');
  return Number(rows[0].id);
}

export const johnDeere5M50855100CurrentSpecsMigration: DbMigration = {
  id: '20260828_268_john_deere_5m_5085_5100_current_specs',
  description: 'Add official US John Deere 5085M, 5090M and 5100M current-supported 5M specifications',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceRecordId = await id(c, `SELECT id FROM source_records WHERE external_id='john-deere-5000m-pricebook-2025-11-05' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'5M Series','5m-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf,et]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='5m-series' LIMIT 1`, [mf,et]);

    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Engine','engine.family','Engine','text',null,5],
      ['Engine','engine.cylinders','Cylinders','integer',null,6],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',10],
      ['Engine','engine.displacement','Engine displacement','decimal','L',20],
      ['Engine','engine.aspiration','Aspiration','text',null,40],
      ['Engine','engine.emissions','Emissions','text',null,50],
      ['Transmission','transmission.options','Transmission options','text',null,20],
      ['PTO','pto.rated_power','PTO power','decimal','hp',10],
      ['Hydraulics','hydraulics.total_flow','Maximum total flow','decimal','L/min',10],
      ['Hydraulics','hydraulics.steering_pump_flow','Steering pump flow','decimal','L/min',20],
      ['Hydraulics','hydraulics.implement_pump_flow','Implement pump flow','decimal','L/min',30],
      ['Capacities','capacities.def_tank','DEF tank','decimal','US gal',20],
      ['Electrical','electrical.system_voltage','Electrical system','integer','V',10],
      ['Electrical','electrical.battery_cca','Battery','integer','CCA',30],
    ];
    for (const d of defs) await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);

    for (const m of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current-supported US John Deere 5M utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf,et,seriesId,m.model,m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current-supported 5M utility tractor',TRUE,?,'Specifications use the official John Deere North America 5000M price book dated 5 November 2025. Deere US product/parts support remains current in August 2026.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId,VERSION,sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION]);
      const vals: Array<[string,string|number,string|null]> = [
        ['engine.family','John Deere PowerTech diesel',null],
        ['engine.cylinders',4,null],
        ['engine.rated_power',m.hp,'hp'],
        ['engine.displacement',4.5,'L'],
        ['engine.aspiration','Turbocharged with intercooler',null],
        ['engine.emissions','EPA Final Tier 4 compliant',null],
        ['transmission.options',m.transmissionNote,null],
        ['pto.rated_power',m.ptoHp,'hp'],
        ['hydraulics.total_flow',94,'L/min'],
        ['hydraulics.steering_pump_flow',24,'L/min'],
        ['hydraulics.implement_pump_flow',70,'L/min'],
        ['capacities.def_tank',3.2,'US gal'],
        ['electrical.system_voltage',12,'V'],
        ['electrical.battery_cca',925,'CCA'],
      ];
      for (const [key,value,unit] of vals) {
        const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId,versionId,defId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);
      }
    }
  },
};
