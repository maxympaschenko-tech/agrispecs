import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Guide = {
  slug: string;
  url: string;
  externalId: string;
  title: string;
  hasCabFilters: boolean;
  hasFrontPtoFilter: boolean;
};

const guides: Guide[] = [
  { slug:'4044m', url:'https://www.deere.com/assets/pdfs/common/qrg/rpg-4044m-cut-na-edition.pdf', externalId:'jd-rpg-4044m-my24-na-2024-04', title:'John Deere 4044M Compact Utility Tractor MY24 North America Replacement Parts Guide', hasCabFilters:true, hasFrontPtoFilter:false },
  { slug:'4052m', url:'https://www.deere.com/assets/pdfs/common/qrg/rpg-4052m-cut-my24-ww-edition.pdf', externalId:'jd-rpg-4052m-my24-worldwide-2024-03', title:'John Deere 4052M Compact Utility Tractor MY24 Worldwide Replacement Parts Guide', hasCabFilters:false, hasFrontPtoFilter:true },
  { slug:'4044r', url:'https://www.deere.com/assets/pdfs/common/qrg/rpg-4044r-cut-my24-ww-edition.pdf', externalId:'jd-rpg-4044r-my24-worldwide-2024-03', title:'John Deere 4044R Compact Utility Tractor MY24 Worldwide Replacement Parts Guide', hasCabFilters:true, hasFrontPtoFilter:true },
  { slug:'4052r', url:'https://www.deere.com/assets/pdfs/common/qrg/rpg-4052r-cut-my24-ww-edition.pdf', externalId:'jd-rpg-4052r-my24-worldwide-2024-03', title:'John Deere 4052R Compact Utility Tractor MY24 Worldwide Replacement Parts Guide', hasCabFilters:true, hasFrontPtoFilter:true },
  { slug:'4066r', url:'https://www.deere.com/assets/pdfs/common/qrg/rpg-4066r-cut-my24-ww-edition.pdf', externalId:'jd-rpg-4066r-my24-worldwide-2024-03', title:'John Deere 4066R Compact Utility Tractor MY24 Worldwide Replacement Parts Guide', hasCabFilters:true, hasFrontPtoFilter:true },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during MY24 4 Series maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere4SeriesMY24MaintenanceMigration: DbMigration = {
  id: '20260827_098_4_series_my24_maintenance',
  description: 'Add MY24 John Deere 4044M, 4052M, 4044R, 4052R and 4066R maintenance parts, intervals and capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const partSeeds = [
      ['M806419','Engine Oil Filter','engine-oil-filters'],
      ['MIA882963','Spin-On Fuel Filter Kit','fuel-filters'],
      ['MIU803127','Fuel Filter Element','fuel-filters'],
      ['MIA885324','Fuel / Water Separator Kit','fuel-filters'],
      ['MIU802421','Fuel / Water Separator Element','fuel-filters'],
      ['RE68048','Primary Air Filter','air-filters'],
      ['RE68049','Secondary Air Filter','air-filters'],
      ['MIU10010','Fresh Cab Air Filter','cab-air-filters'],
      ['MIU10011','Recirculation Cab Air Filter','cab-air-filters'],
      ['RE45864','Transmission Oil Filter','hydraulic-filters'],
      ['LVA10419','Hydraulic Oil Filter','hydraulic-filters'],
      ['LVA23443','Front PTO Filter','hydraulic-filters'],
      ['TA25765','Filter Pak','maintenance-kits'],
      ['TY26669','Plus-50 II Premium 10W-30 Engine Oil','engine-oils'],
      ['TY22000','Low Viscosity Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
      ['TY22035','Low Viscosity Hy-Gard Front Axle Oil','transmission-hydraulic-fluids'],
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

    for (const guide of guides) {
      const machineId = await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [guide.slug]);
      const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [guide.externalId]);
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
          [sourceId,guide.url,guide.externalId,guide.title,guide.slug === '4044m' ? '2024-04-01' : '2024-03-01'],
        );
        sourceRecordId = Number(result.insertId);
      }

      const fitments: Array<[string,string]> = [
        ['M806419',`${guide.slug.toUpperCase()} MY24 engine oil filter; 400 hours or annually`],
        ['MIA882963',`${guide.slug.toUpperCase()} MY24 spin-on fuel filter kit; 400 hours or annually`],
        ['MIU803127',`${guide.slug.toUpperCase()} MY24 fuel filter element; 400 hours or annually`],
        ['MIA885324',`${guide.slug.toUpperCase()} MY24 fuel/water separator kit; 400 hours or annually`],
        ['MIU802421',`${guide.slug.toUpperCase()} MY24 fuel/water separator element; 400 hours or annually`],
        ['RE68048',`${guide.slug.toUpperCase()} MY24 primary air filter; 600 hours or annually`],
        ['RE68049',`${guide.slug.toUpperCase()} MY24 secondary air filter; 600 hours or annually`],
        ['RE45864',`${guide.slug.toUpperCase()} MY24 transmission oil filter; 400 hours or annually`],
        ['LVA10419',`${guide.slug.toUpperCase()} MY24 hydraulic oil filter; 400 hours or annually`],
        ['TA25765',`${guide.slug.toUpperCase()} MY24 filter maintenance kit`],
        ['TY26669',`${guide.slug.toUpperCase()} MY24 Plus-50 II 10W-30 engine oil; 5.4 L`],
        ['TY22000',`${guide.slug.toUpperCase()} MY24 transmission/hydraulic oil; 47.3 L`],
        ['TY22035',`${guide.slug.toUpperCase()} MY24 front axle oil; 5.5 L standard or 8.0 L heavy-duty axle`],
      ];
      if (guide.hasCabFilters) {
        fitments.push(['MIU10010',`${guide.slug.toUpperCase()} MY24 fresh cab air filter; 50 hours when equipped`]);
        fitments.push(['MIU10011',`${guide.slug.toUpperCase()} MY24 recirculation cab air filter; 50 hours when equipped`]);
      }
      if (guide.hasFrontPtoFilter) fitments.push(['LVA23443',`${guide.slug.toUpperCase()} MY24 front PTO filter; 400 hours or annually when equipped`]);

      for (const [number,note] of fitments) {
        const pid = await partId(number);
        const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,pid,note]);
        if (!existing[0]) await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
      }

      const tasks: Array<{key:string;section:string;action:string;title:string;part:string;hours:number;months:number|null;capacity:number|null;unit:string|null;text:string;notes:string|null}> = [
        { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:'TY26669', hours:400, months:12, capacity:5.4, unit:'L', text:'Every 400 hours or annually, whichever comes first', notes:'John Deere Plus-50 II Premium 10W-30; 5.4 L (5.7 qt).' },
        { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'M806419', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'spin-on-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Spin-on fuel filter', part:'MIA882963', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'MIU803127 is listed as the filter element.' },
        { key:'fuel-water-separator', section:'Fuel & Air', action:'Replace', title:'Fuel / water separator', part:'MIA885324', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'MIU802421 is listed as the filter element.' },
        { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'RE68048', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
        { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'RE68049', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
        { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission / hydraulic oil', part:'TY22000', hours:400, months:12, capacity:47.3, unit:'L', text:'Every 400 hours or annually', notes:'John Deere Low Viscosity Hy-Gard; 47.3 L (12.5 gal).' },
        { key:'transmission-filter', section:'Transmission', action:'Replace', title:'Transmission oil filter', part:'RE45864', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:null },
        { key:'hydraulic-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', part:'LVA10419', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:null },
        { key:'front-axle-standard', section:'Axle', action:'Change', title:'Front axle oil - standard axle', part:'TY22035', hours:600, months:null, capacity:5.5, unit:'L', text:'Every 600 hours', notes:'Standard axle capacity 5.5 L (5.8 qt).' },
        { key:'front-axle-heavy-duty', section:'Axle', action:'Change', title:'Front axle oil - heavy-duty axle', part:'TY22035', hours:600, months:null, capacity:8.0, unit:'L', text:'Every 600 hours', notes:'Heavy-duty axle capacity 8.0 L (8.5 qt).' },
      ];
      if (guide.hasCabFilters) {
        tasks.push({ key:'cab-fresh-air-filter', section:'Cab', action:'Clean / replace', title:'Cab fresh air filter', part:'MIU10010', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:'When cab equipped.' });
        tasks.push({ key:'cab-recirculation-filter', section:'Cab', action:'Clean / replace', title:'Cab recirculation air filter', part:'MIU10011', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:'When cab equipped.' });
      }
      if (guide.hasFrontPtoFilter) tasks.push({ key:'front-pto-filter', section:'PTO', action:'Replace', title:'Front PTO filter', part:'LVA23443', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'When equipped with front PTO.' });

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
        ['engine-oil','Engine oil','',5.4,'L','John Deere Plus-50 II Premium 10W-30','5.7 qt.'],
        ['transmission-hydraulic','Transmission / hydraulic system','',47.3,'L','John Deere Low Viscosity Hy-Gard','12.5 US gal.'],
        ['front-axle-standard','Front axle','Standard axle',5.5,'L','John Deere Low Viscosity Hy-Gard','5.8 qt.'],
        ['front-axle-heavy-duty','Front axle','Heavy-duty axle',8.0,'L','John Deere Low Viscosity Hy-Gard','8.5 qt.'],
      ] as const;
      for (const [systemKey,label,configuration,value,unit,fluid,notes] of capacities) {
        await connection.query(
          `INSERT INTO machine_capacities (machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence)
           VALUES (?,?,?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
          [machineId,systemKey,label,configuration,value,unit,fluid,notes,sourceRecordId],
        );
      }
    }
  },
};
