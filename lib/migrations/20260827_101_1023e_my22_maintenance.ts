import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-1023e-cut-my22-na-edition.pdf';
const SOURCE_EXTERNAL_ID = 'jd-rpg-1023e-my22-np100000-na-2024-03';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 1023E MY22 maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere1023EMY22MaintenanceMigration: DbMigration = {
  id: '20260827_101_1023e_my22_maintenance',
  description: 'Add MY22-current John Deere 1023E North America maintenance parts, intervals and capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug='1023e' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere 1023E Compact Utility Tractor MY22- NP100000- North America Replacement Parts Guide','2024-03-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const partSeeds = [
      ['M806418','Engine Oil Filter','engine-oil-filters'],
      ['LVU34503','Primary Air Filter','air-filters'],
      ['LVU34504','Secondary Air Filter','air-filters'],
      ['MIU804763','Fuel Filter Element','fuel-filters'],
      ['AM116304','Inline Fuel Filter','fuel-filters'],
      ['LVA16054','Hydraulic Oil Filter','hydraulic-filters'],
      ['TA25769','Filter Pak','maintenance-kits'],
      ['TY26668','Plus-50 II Premium 10W-30 Engine Oil','engine-oils'],
      ['TY22062','Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
      ['TY22000','Low Viscosity Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
    ] as const;

    for (const [number,name,categorySlug] of partSeeds) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,number,name],
      );
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,number]);
    }

    const fitments: Array<[string,string]> = [
      ['M806418','1023E MY22- NP100000 engine oil filter; 400 hours or annually'],
      ['LVU34503','1023E MY22- NP100000 primary air filter; 600 hours'],
      ['LVU34504','1023E MY22- NP100000 secondary air filter; 600 hours'],
      ['MIU804763','1023E MY22- NP100000 fuel filter element; 400 hours or annually'],
      ['AM116304','1023E MY22- NP100000 inline fuel filter; 400 hours or annually'],
      ['LVA16054','1023E MY22- NP100000 hydraulic oil filter; 200 hours'],
      ['TA25769','1023E MY22- NP100000 filter maintenance kit'],
      ['TY26668','1023E MY22- NP100000 Plus-50 II 10W-30 engine oil; 2.7 L with filter'],
      ['TY22062','1023E MY22- NP100000 Hy-Gard transmission/hydraulic oil; 12.3 L; front axle 2.8 L'],
      ['TY22000','1023E MY22- NP100000 Low Viscosity Hy-Gard alternative; transmission/hydraulic 12.3 L; front axle 2.8 L'],
    ];
    for (const [number,note] of fitments) {
      const pid = await partId(number);
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,pid,note]);
      if (!existing[0]) await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
    }

    const tasks = [
      { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:'TY26668', hours:400, months:12, capacity:2.7, unit:'L', text:'Every 400 hours or annually, whichever comes first', notes:'John Deere Plus-50 II Premium 10W-30; 2.7 L (2.9 qt) with filter.' },
      { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'M806418', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
      { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'LVU34503', hours:600, months:null, capacity:null, unit:null, text:'Every 600 hours', notes:null },
      { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'LVU34504', hours:600, months:null, capacity:null, unit:null, text:'Every 600 hours', notes:null },
      { key:'fuel-filter-element', section:'Fuel & Air', action:'Replace', title:'Fuel filter element', part:'MIU804763', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
      { key:'inline-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Inline fuel filter', part:'AM116304', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
      { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission and hydraulic oil', part:'TY22000', hours:200, months:null, capacity:12.3, unit:'L', text:'Every 200 hours', notes:'Guide lists John Deere Hy-Gard TY22062 or Low Viscosity Hy-Gard TY22000; 12.3 L (3.25 gal).' },
      { key:'hydraulic-oil-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', part:'LVA16054', hours:200, months:null, capacity:null, unit:null, text:'Every 200 hours', notes:null },
      { key:'front-axle-oil', section:'Axle', action:'Change', title:'Front axle oil', part:'TY22000', hours:600, months:null, capacity:2.8, unit:'L', text:'Every 600 hours', notes:'Guide lists John Deere Hy-Gard TY22062 or Low Viscosity Hy-Gard TY22000; 2.8 L (3.0 qt).' },
    ] as const;

    for (const task of tasks) {
      const pid = await partId(task.part);
      await connection.query(
        `INSERT INTO maintenance_tasks (machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),capacity_value=VALUES(capacity_value),capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
        [machineId,task.key,task.section,task.action,task.title,pid,task.hours,task.months,task.capacity,task.unit,task.text,task.notes,sourceRecordId],
      );
    }

    const capacities = [
      ['engine-oil','Engine oil','MY22- NP100000-',2.7,'L','John Deere Plus-50 II Premium 10W-30','2.9 qt with filter.'],
      ['transmission-hydraulic','Transmission / hydraulic system','MY22- NP100000-',12.3,'L','John Deere Hy-Gard / Low Viscosity Hy-Gard','3.25 US gal.'],
      ['front-axle','Front axle','MY22- NP100000-',2.8,'L','John Deere Hy-Gard / Low Viscosity Hy-Gard','3.0 qt.'],
    ] as const;
    for (const [systemKey,label,configuration,value,unit,fluid,notes] of capacities) {
      await connection.query(
        `INSERT INTO machine_capacities (machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence)
         VALUES (?,?,?,?,?,?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
        [machineId,systemKey,label,configuration,value,unit,fluid,notes,sourceRecordId],
      );
    }
  },
};
