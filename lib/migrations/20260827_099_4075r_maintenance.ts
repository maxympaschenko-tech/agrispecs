import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/4075r-compact-utility-tractor.pdf';
const SOURCE_EXTERNAL_ID = 'jd-rpg-4075r-2023-12';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 4075R maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere4075RMaintenanceMigration: DbMigration = {
  id: '20260827_099_4075r_maintenance',
  description: 'Add official John Deere 4075R maintenance parts, intervals and capacities from the December 2023 guide',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug='4075r' LIMIT 1`);

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
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere 4075R Compact Utility Tractor Replacement Parts Guide','2023-12-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const partSeeds = [
      ['MIU800646','Engine Oil Filter','engine-oil-filters'],
      ['MIU803127','Fuel Filter','fuel-filters'],
      ['MIA885324','Fuel / Water Separator Kit','fuel-filters'],
      ['MIU802421','Fuel / Water Separator Element','fuel-filters'],
      ['AP33330','Primary Air Filter','air-filters'],
      ['AP33331','Secondary Air Filter','air-filters'],
      ['MIU10010','Fresh Cab Air Filter','cab-air-filters'],
      ['MIU10011','Recirculation Cab Air Filter','cab-air-filters'],
      ['RE45864','Transmission Oil Filter','hydraulic-filters'],
      ['LVA10419','Hydrostatic Transmission Filter','hydraulic-filters'],
      ['TY26668','Plus-50 II 10W-30 Engine Oil','engine-oils'],
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
      ['MIU800646','4075R engine oil filter; 400 hours or annually'],
      ['MIU803127','4075R fuel filter; 400 hours or annually'],
      ['MIA885324','4075R fuel/water separator kit; 400 hours or annually'],
      ['MIU802421','4075R fuel/water separator element; 400 hours or annually'],
      ['AP33330','4075R primary air filter; 600 hours or annually'],
      ['AP33331','4075R secondary air filter; 600 hours or annually'],
      ['MIU10010','4075R fresh cab air filter; 50 hours'],
      ['MIU10011','4075R recirculation cab air filter; 50 hours'],
      ['RE45864','4075R transmission oil filter; 1200 hours or 3 years'],
      ['LVA10419','4075R hydrostatic transmission filter; 1200 hours or 3 years'],
      ['TY26668','4075R Plus-50 II 10W-30 engine oil; 5.4 L with filter'],
      ['TY22000','4075R Low Viscosity Hy-Gard; transmission 47.3 L and front axle 8.0 L'],
    ];
    for (const [number,note] of fitments) {
      const pid = await partId(number);
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,pid,note]);
      if (!existing[0]) await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
    }

    const tasks = [
      { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:'TY26668', hours:400, months:12, capacity:5.4, unit:'L', text:'Every 400 hours or annually, whichever comes first', notes:'John Deere Plus-50 II 10W-30; crankcase with filter 5.4 L (5.7 qt).' },
      { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'MIU800646', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
      { key:'fuel-filter', section:'Fuel & Air', action:'Replace', title:'Fuel filter', part:'MIU803127', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:null },
      { key:'fuel-water-separator', section:'Fuel & Air', action:'Replace', title:'Fuel / water separator', part:'MIA885324', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'MIU802421 is listed as the filter element.' },
      { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'AP33330', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
      { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'AP33331', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
      { key:'cab-fresh-air-filter', section:'Cab', action:'Replace', title:'Cab fresh air filter', part:'MIU10010', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:'4075R is cab-only in the current US product line.' },
      { key:'cab-recirculation-filter', section:'Cab', action:'Replace', title:'Cab recirculation air filter', part:'MIU10011', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:null },
      { key:'transmission-oil', section:'Transmission', action:'Change', title:'Transmission oil', part:'TY22000', hours:1200, months:36, capacity:47.3, unit:'L', text:'Every 1200 hours or 3 years', notes:'John Deere Low Viscosity Hy-Gard J20D; 47.3 L (12.5 gal).' },
      { key:'transmission-filter', section:'Transmission', action:'Replace', title:'Transmission oil filter', part:'RE45864', hours:1200, months:36, capacity:null, unit:null, text:'Every 1200 hours or 3 years', notes:null },
      { key:'hydrostatic-transmission-filter', section:'Transmission', action:'Replace', title:'Hydrostatic transmission filter', part:'LVA10419', hours:1200, months:36, capacity:null, unit:null, text:'Every 1200 hours or 3 years', notes:null },
      { key:'front-axle-oil', section:'Axle', action:'Change', title:'Front axle oil', part:'TY22000', hours:600, months:12, capacity:8.0, unit:'L', text:'Every 600 hours or annually', notes:'John Deere Low Viscosity Hy-Gard; 8.0 L (8.5 qt).' },
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
      ['engine-oil','Engine oil','',5.4,'L','John Deere Plus-50 II 10W-30','5.7 qt with filter.'],
      ['transmission-oil','Transmission oil','Hydrostatic transmission',47.3,'L','John Deere Low Viscosity Hy-Gard J20D','12.5 US gal.'],
      ['front-axle','Front axle','Heavy-duty front axle',8.0,'L','John Deere Low Viscosity Hy-Gard','8.5 qt.'],
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
