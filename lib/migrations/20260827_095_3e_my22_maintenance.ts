import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Guide = {
  slug: string;
  url: string;
  externalId: string;
  title: string;
};

const guides: Guide[] = [
  {
    slug: '3025e',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3025e-tractor-my22-ww-edition.pdf',
    externalId: 'jd-rpg-3025e-my22-np100000-worldwide-2024-03',
    title: 'John Deere 3025E Tractor MY22- NP100000- Replacement Parts Guide - Worldwide Edition',
  },
  {
    slug: '3032e',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3032e-tractor-my22-ww-edition.pdf',
    externalId: 'jd-rpg-3032e-my22-np100000-worldwide-2024-03',
    title: 'John Deere 3032E Tractor MY22- NP100000- Replacement Parts Guide - Worldwide Edition',
  },
  {
    slug: '3038e',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3038e-tractor-my22-ww-edition.pdf',
    externalId: 'jd-rpg-3038e-my22-np100000-worldwide-2024-03',
    title: 'John Deere 3038E Tractor MY22- NP100000- Replacement Parts Guide - Worldwide Edition',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during MY22 3E maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere3EMY22MaintenanceMigration: DbMigration = {
  id: '20260827_095_3e_my22_maintenance',
  description: 'Add MY22-current John Deere 3025E, 3032E and 3038E maintenance parts, intervals and capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const partSeeds = [
      ['M806419','Engine Oil Filter','engine-oil-filters'],
      ['UC28887','Primary Air Filter','air-filters'],
      ['UC28888','Secondary Air Filter','air-filters'],
      ['MIU800645','Primary Fuel Filter','fuel-filters'],
      ['MIU803127','Final Fuel Filter','fuel-filters'],
      ['AM881823','Fuel / Water Separator Kit','fuel-filters'],
      ['M811032','Fuel / Water Separator Filter Element','fuel-filters'],
      ['LVA14703','Transmission Oil Filter','hydraulic-filters'],
      ['LVA16054','Hydraulic Oil Filter','hydraulic-filters'],
      ['TA26997','Filter Pak','maintenance-kits'],
      ['TY26668','Plus-50 II Premium 10W-30 Engine Oil','engine-oils'],
      ['TY22000','Low Viscosity Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
      ['TY22062','Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
    ] as const;

    for (const [number,name,categorySlug] of partSeeds) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, number, number, name],
      );
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, number]);
    }

    for (const guide of guides) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
        [guide.slug],
      );

      const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [guide.externalId]);
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
          [sourceId, guide.url, guide.externalId, guide.title, '2024-03-01'],
        );
        sourceRecordId = Number(result.insertId);
      }

      const fitments: Array<[string,string]> = [
        ['M806419',`${guide.slug.toUpperCase()} MY22- engine oil filter; 400 hours or annually`],
        ['UC28887',`${guide.slug.toUpperCase()} MY22- primary air filter; 600 hours`],
        ['UC28888',`${guide.slug.toUpperCase()} MY22- secondary air filter; 600 hours`],
        ['MIU800645',`${guide.slug.toUpperCase()} MY22- primary fuel filter; 400 hours or annually`],
        ['MIU803127',`${guide.slug.toUpperCase()} MY22- final fuel filter; 400 hours or annually`],
        ['AM881823',`${guide.slug.toUpperCase()} MY22- fuel/water separator kit`],
        ['M811032',`${guide.slug.toUpperCase()} MY22- fuel/water separator element`],
        ['LVA14703',`${guide.slug.toUpperCase()} MY22- transmission oil filter; 400 hours`],
        ['LVA16054',`${guide.slug.toUpperCase()} MY22- hydraulic oil filter; 400 hours`],
        ['TA26997',`${guide.slug.toUpperCase()} MY22- filter maintenance kit`],
        ['TY26668',`${guide.slug.toUpperCase()} MY22- Plus-50 II 10W-30 engine oil; 4.5 L with filter`],
        ['TY22000',`${guide.slug.toUpperCase()} MY22- Low Viscosity Hy-Gard; transmission/hydraulic 20.8 L and front axle 3.8 L`],
        ['TY22062',`${guide.slug.toUpperCase()} MY22- Hy-Gard alternative listed for transmission/hydraulic system and front axle`],
      ];

      for (const [number,note] of fitments) {
        const pid = await partId(number);
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,pid,note],
        );
        if (!existing[0]) {
          await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
        }
      }

      const tasks = [
        { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:'TY26668', hours:400, months:12, capacity:4.5, unit:'L', text:'Every 400 hours or annually, whichever comes first', notes:'John Deere Plus-50 II Premium 10W-30; 4.5 L (4.7 qt) with filter.' },
        { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'M806419', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'UC28887', hours:600, months:null, capacity:null, unit:null, text:'Every 600 hours', notes:null },
        { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'UC28888', hours:600, months:null, capacity:null, unit:null, text:'Every 600 hours', notes:null },
        { key:'primary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Primary fuel filter', part:'MIU800645', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'final-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Final fuel filter', part:'MIU803127', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'transmission-oil-filter', section:'Transmission', action:'Replace', title:'Transmission oil filter', part:'LVA14703', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:null },
        { key:'hydraulic-oil-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', part:'LVA16054', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:null },
        { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission and hydraulic oil', part:'TY22000', hours:1200, months:36, capacity:20.8, unit:'L', text:'Every 1200 hours or 3 years, whichever comes first', notes:'Guide lists John Deere Hy-Gard TY22062 or Low Viscosity Hy-Gard TY22000; 20.8 L (5.5 gal).' },
        { key:'front-axle-oil', section:'Axle', action:'Change', title:'Front axle oil', part:'TY22000', hours:600, months:null, capacity:3.8, unit:'L', text:'Every 600 hours', notes:'Guide lists John Deere Hy-Gard TY22062 or Low Viscosity Hy-Gard TY22000; 3.8 L (4.0 qt).' },
      ] as const;

      for (const task of tasks) {
        const pid = await partId(task.part);
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,
            capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
          ON DUPLICATE KEY UPDATE
            section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
            interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),capacity_value=VALUES(capacity_value),
            capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
          [machineId,task.key,task.section,task.action,task.title,pid,task.hours,task.months,task.capacity,task.unit,task.text,task.notes,sourceRecordId],
        );
      }

      const capacities = [
        ['engine-oil','Engine oil','',4.5,'L','John Deere Plus-50 II Premium 10W-30','With filter; 4.7 qt.'],
        ['transmission-hydraulic','Transmission and hydraulic system','',20.8,'L','John Deere Hy-Gard / Low Viscosity Hy-Gard','5.5 US gal.'],
        ['front-axle','Front axle','MFWD',3.8,'L','John Deere Hy-Gard / Low Viscosity Hy-Gard','4.0 qt.'],
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
