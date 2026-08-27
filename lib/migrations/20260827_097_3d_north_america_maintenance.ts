import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const FILTER_URL = 'https://www.deere.com/assets/pdfs/common/qrg/3d-series-north-america-edition.pdf';
const CAPACITY_URL = 'https://jdparts.deere.com/partsmkt/unsecured/document/english/checklst/3D_Series_Compact_Utility_Tractors_3025D_3035D_3043D_North_America_Edition.pdf';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 3D North America maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere3DNorthAmericaMaintenanceMigration: DbMigration = {
  id: '20260827_097_3d_north_america_maintenance',
  description: 'Add official North American John Deere 3025D, 3035D and 3043D filters, service intervals and capacities',
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

    async function ensureSource(externalId: string, url: string, title: string, publishedDate: string) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
      if (existing[0]?.id) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,url,externalId,title,publishedDate],
      );
      return Number(result.insertId);
    }

    const filterSourceId = await ensureSource(
      'jd-3d-north-america-filter-overview-2021-05',
      FILTER_URL,
      'John Deere 3D Series Compact Utility Tractors 3025D, 3035D, 3043D - North America Filter Overview',
      '2021-05-01',
    );
    const capacitySourceId = await ensureSource(
      'jd-3d-north-america-capacities-2020-07',
      CAPACITY_URL,
      'John Deere 3D Series Compact Utility Tractors 3025D, 3035D, 3043D - North America Capacities',
      '2020-07-01',
    );

    const partSeeds = [
      ['M806419','Engine Oil Filter','engine-oil-filters'],
      ['SJ16911','Primary Air Filter','air-filters'],
      ['SJ16914','Secondary Air Filter','air-filters'],
      ['M811032','Fuel / Water Separator Filter Element','fuel-filters'],
      ['MIU800645','Primary Fuel Filter','fuel-filters'],
      ['MIU803127','Secondary Fuel Filter','fuel-filters'],
      ['RE45864','Transmission / Hydraulic Oil Filter','hydraulic-filters'],
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

    for (const slug of ['3025d','3035d','3043d']) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
        [slug],
      );

      const fitments: Array<[string,string]> = [
        ['M806419',`${slug.toUpperCase()} North America engine oil filter; 400 hours or annually`],
        ['SJ16911',`${slug.toUpperCase()} North America primary air filter; inspect/replace at 600 hours or as required`],
        ['SJ16914',`${slug.toUpperCase()} North America secondary air filter; inspect/replace at 600 hours or as required`],
        ['M811032',`${slug.toUpperCase()} North America fuel/water separator element; 400 hours or annually`],
        ['MIU800645',`${slug.toUpperCase()} North America primary fuel filter; 400 hours or annually`],
        ['RE45864',`${slug.toUpperCase()} North America transmission/hydraulic oil filter`],
      ];
      if (slug !== '3025d') {
        fitments.push(['MIU803127',`${slug.toUpperCase()} North America secondary fuel filter; 400 hours or annually`]);
      }

      for (const [number,note] of fitments) {
        const pid = await partId(number);
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,pid,note],
        );
        if (!existing[0]) {
          await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId,pid,note,filterSourceId]);
        }
      }

      const tasks = [
        { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'M806419', hours:400, months:12, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'primary-air-filter', section:'Fuel & Air', action:'Check / replace', title:'Primary air filter', part:'SJ16911', hours:600, months:null, text:'Check or replace every 600 hours or as required', notes:null },
        { key:'secondary-air-filter', section:'Fuel & Air', action:'Check / replace', title:'Secondary air filter', part:'SJ16914', hours:600, months:null, text:'Check or replace every 600 hours or as required', notes:null },
        { key:'fuel-water-separator', section:'Fuel & Air', action:'Replace', title:'Fuel / water separator element', part:'M811032', hours:400, months:12, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'primary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Primary fuel filter', part:'MIU800645', hours:400, months:12, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'transmission-hydraulic-filter', section:'Transmission', action:'Replace', title:'Transmission / hydraulic oil filter', part:'RE45864', hours:400, months:null, text:'Every 400 hours; also service at the 1200-hour / 3-year interval', notes:'John Deere filter overview calls out both the recurring 400-hour filter service and the 1200-hour/3-year service.' },
      ] as const;

      for (const task of tasks) {
        const pid = await partId(task.part);
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,interval_text,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,'official')
          ON DUPLICATE KEY UPDATE
            section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
            interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),interval_text=VALUES(interval_text),
            notes=VALUES(notes),confidence='official'`,
          [machineId,task.key,task.section,task.action,task.title,pid,task.hours,task.months,task.text,task.notes,filterSourceId],
        );
      }

      if (slug !== '3025d') {
        const pid = await partId('MIU803127');
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,interval_text,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,?,?,?,'official')
          ON DUPLICATE KEY UPDATE part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),interval_text=VALUES(interval_text),confidence='official'`,
          [machineId,'secondary-fuel-filter','Fuel & Air','Replace','Secondary fuel filter',pid,400,12,'Every 400 hours or annually, whichever comes first',filterSourceId],
        );
      }

      const coolingL = slug === '3043d' ? 5.0 : 4.5;
      const capacities = [
        ['fuel-tank','Fuel tank','',38,'L',null,'10 US gal.'],
        ['engine-oil','Crankcase with filter','',4.3,'L','John Deere Plus-50','1.1 US gal.'],
        ['transmission-hydraulic','Transmission / hydraulic system','',35,'L',null,'9.24 US gal.'],
        ['front-axle','Front axle','MFWD',3.8,'L','John Deere Hy-Gard','1.0 US gal.'],
        ['cooling-system','Cooling system','',coolingL,'L','John Deere Cool-Gard II',slug === '3043d' ? '1.32 US gal.' : '1.18 US gal.'],
      ] as const;
      for (const [systemKey,label,configuration,value,unit,fluid,notes] of capacities) {
        await connection.query(
          `INSERT INTO machine_capacities (machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence)
           VALUES (?,?,?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
          [machineId,systemKey,label,configuration,value,unit,fluid,notes,capacitySourceId],
        );
      }
    }
  },
};
