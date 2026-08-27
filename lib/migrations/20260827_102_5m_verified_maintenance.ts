import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Guide = {
  slug: '5075m' | '5095m' | '5105m';
  url: string;
  externalId: string;
  title: string;
};

const guides: Guide[] = [
  {
    slug: '5075m',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/5m-5075m-north-america-edition.pdf',
    externalId: 'jd-rpg-5075m-na-2023-01',
    title: 'John Deere 5075M Tractor North America Replacement Parts Guide',
  },
  {
    slug: '5095m',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/5-series-5095m-north-america-edi.pdf',
    externalId: 'jd-rpg-5095m-na-2022-12',
    title: 'John Deere 5095M Tractor North America Replacement Parts Guide',
  },
  {
    slug: '5105m',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/5-5105m-tractors-north-america-edi.pdf',
    externalId: 'jd-rpg-5105m-na-2022-12',
    title: 'John Deere 5105M Tractor North America Replacement Parts Guide',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during verified 5M maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere5MVerifiedMaintenanceMigration: DbMigration = {
  id: '20260827_102_5m_verified_maintenance',
  description: 'Add official North America maintenance parts and intervals for John Deere 5075M, 5095M and 5105M',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Engine Breather Filters','engine-breather-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const partSeeds = [
      ['RE519626','Engine Oil Filter','engine-oil-filters'],
      ['DZ114256','Engine Oil Filter','engine-oil-filters'],
      ['DZ114096','Fuel Filter','fuel-filters'],
      ['SU20768','Primary Air Filter','air-filters'],
      ['RE253519','Secondary Air Filter','air-filters'],
      ['RE553871','Open Crankcase Ventilation Filter','engine-breather-filters'],
      ['RE198488','Fresh Cab Air Filter','cab-air-filters'],
      ['RE195491','Recirculation Cab Air Filter','cab-air-filters'],
      ['SJ11784','Hydraulic / Transmission Oil Filter','hydraulic-filters'],
      ['RE504836','Engine Oil Filter','engine-oil-filters'],
      ['DZ115391','Primary Fuel Filter','fuel-filters'],
      ['DZ115390','Final Fuel Filter','fuel-filters'],
      ['TR129895','Primary Air Filter','air-filters'],
      ['TR129896','Secondary Air Filter','air-filters'],
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
          [sourceId,guide.url,guide.externalId,guide.title,guide.slug === '5075m' ? '2023-01-01' : '2022-12-01'],
        );
        sourceRecordId = Number(result.insertId);
      }

      const fitments: Array<[string,string]> = [];
      const tasks: Array<{key:string;section:string;action:string;title:string;part:string;hours:number;initial:number|null;text:string;notes:string|null}> = [];

      if (guide.slug === '5075m') {
        fitments.push(
          ['RE519626','5075M engine oil filter through serial 034279; first 100 hours then every 500 hours'],
          ['DZ114256','5075M engine oil filter serial 034280 and later; first 100 hours then every 500 hours'],
          ['DZ114096','5075M fuel filter; every 500 hours'],
          ['SU20768','5075M primary air filter; every 1000 hours'],
          ['RE253519','5075M secondary air filter; every 1000 hours'],
          ['RE553871','5075M open crankcase ventilation filter; every 1500 hours'],
          ['RE198488','5075M fresh cab air filter; every 500 hours when equipped'],
          ['RE195491','5075M recirculation cab air filter; every 500 hours when equipped'],
          ['SJ11784','5075M hydraulic/transmission oil filter; first 100 hours then every 500 hours'],
        );
        tasks.push(
          { key:'engine-oil-filter-early-serial', section:'Engine', action:'Replace', title:'Engine oil filter - through serial 034279', part:'RE519626', hours:500, initial:100, text:'After the first 100 hours, then every 500 hours', notes:'Applies through serial number 034279.' },
          { key:'engine-oil-filter-late-serial', section:'Engine', action:'Replace', title:'Engine oil filter - serial 034280 and later', part:'DZ114256', hours:500, initial:100, text:'After the first 100 hours, then every 500 hours', notes:'Applies to serial number 034280 and later.' },
          { key:'fuel-filter', section:'Fuel & Air', action:'Replace', title:'Fuel filter', part:'DZ114096', hours:500, initial:null, text:'Every 500 hours', notes:null },
          { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'SU20768', hours:1000, initial:null, text:'Every 1000 hours', notes:null },
          { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'RE253519', hours:1000, initial:null, text:'Every 1000 hours', notes:null },
          { key:'ocv-filter', section:'Engine', action:'Replace', title:'Open crankcase ventilation filter', part:'RE553871', hours:1500, initial:null, text:'Every 1500 hours', notes:null },
          { key:'fresh-cab-filter', section:'Cab', action:'Clean / replace', title:'Fresh cab air filter', part:'RE198488', hours:500, initial:null, text:'Every 500 hours', notes:'When equipped; service sooner as conditions require.' },
          { key:'recirculation-cab-filter', section:'Cab', action:'Clean / replace', title:'Recirculation cab air filter', part:'RE195491', hours:500, initial:null, text:'Every 500 hours', notes:'When equipped; service sooner as conditions require.' },
          { key:'hydraulic-transmission-filter', section:'Transmission', action:'Replace', title:'Hydraulic / transmission oil filter', part:'SJ11784', hours:500, initial:100, text:'After the first 100 hours, then every 500 hours', notes:null },
        );
      } else {
        fitments.push(
          ['RE504836',`${guide.slug.toUpperCase()} engine oil filter; every 500 hours`],
          ['DZ115391',`${guide.slug.toUpperCase()} primary fuel filter; every 500 hours`],
          ['DZ115390',`${guide.slug.toUpperCase()} final fuel filter; every 500 hours`],
          ['TR129895',`${guide.slug.toUpperCase()} primary air filter; every 1000 hours`],
          ['TR129896',`${guide.slug.toUpperCase()} secondary air filter; every 1000 hours`],
          ['RE198488',`${guide.slug.toUpperCase()} fresh cab air filter; official North America fitment`],
          ['RE195491',`${guide.slug.toUpperCase()} recirculation cab air filter; official North America fitment`],
          ['SJ11784',`${guide.slug.toUpperCase()} hydraulic/transmission oil filter; first 100 hours then every 500 hours`],
        );
        tasks.push(
          { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'RE504836', hours:500, initial:null, text:'Every 500 hours', notes:null },
          { key:'primary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Primary fuel filter', part:'DZ115391', hours:500, initial:null, text:'Every 500 hours', notes:null },
          { key:'final-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Final fuel filter', part:'DZ115390', hours:500, initial:null, text:'Every 500 hours', notes:null },
          { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'TR129895', hours:1000, initial:null, text:'Every 1000 hours', notes:null },
          { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'TR129896', hours:1000, initial:null, text:'Every 1000 hours', notes:null },
          { key:'hydraulic-transmission-filter', section:'Transmission', action:'Replace', title:'Hydraulic / transmission oil filter', part:'SJ11784', hours:500, initial:100, text:'After the first 100 hours, then every 500 hours', notes:null },
        );
      }

      for (const [number,note] of fitments) {
        const pid = await partId(number);
        const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`, [machineId,pid,note]);
        if (!existing[0]) await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,sourceRecordId]);
      }

      for (const task of tasks) {
        const pid = await partId(task.part);
        await connection.query(
          `INSERT INTO maintenance_tasks (machine_id,task_key,section,action,title,part_id,interval_hours,initial_interval_hours,interval_text,notes,source_record_id,confidence)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),initial_interval_hours=VALUES(initial_interval_hours),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
          [machineId,task.key,task.section,task.action,task.title,pid,task.hours,task.initial,task.text,task.notes,sourceRecordId],
        );
      }
    }
  },
};
