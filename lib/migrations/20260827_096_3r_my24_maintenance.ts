import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Guide = {
  slug: string;
  url: string;
  externalId: string;
  title: string;
  engineOilL: number;
};

const guides: Guide[] = [
  {
    slug: '3033r',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3033r-cut-my24-ww-edition.pdf',
    externalId: 'jd-rpg-3033r-my24-pr100101-worldwide-2024-03',
    title: 'John Deere 3033R Compact Utility Tractor MY24- PR100101- Replacement Parts Guide - Worldwide Edition',
    engineOilL: 4.3,
  },
  {
    slug: '3039r',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3039r-cut-my24-ww-edition.pdf',
    externalId: 'jd-rpg-3039r-my24-pr100101-worldwide-2024-03',
    title: 'John Deere 3039R Compact Utility Tractor MY24- PR100101- Replacement Parts Guide - Worldwide Edition',
    engineOilL: 4.3,
  },
  {
    slug: '3046r',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3046r-cut-my24-ww-edition.pdf',
    externalId: 'jd-rpg-3046r-my24-pr100101-worldwide-2024-03',
    title: 'John Deere 3046R Compact Utility Tractor MY24- PR100101- Replacement Parts Guide - Worldwide Edition',
    engineOilL: 5.7,
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during MY24 3R maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere3RMY24MaintenanceMigration: DbMigration = {
  id: '20260827_096_3r_my24_maintenance',
  description: 'Add MY24-current John Deere 3033R, 3039R and 3046R maintenance parts, intervals and configuration capacities',
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
      ['MIA882963','Spin-On Fuel Filter Kit','fuel-filters'],
      ['MIU803127','Fuel Filter Element','fuel-filters'],
      ['MIA885324','Fuel / Water Separator Kit','fuel-filters'],
      ['MIU802421','Fuel / Water Separator Element','fuel-filters'],
      ['RE68048','Primary Air Filter','air-filters'],
      ['RE68049','Secondary Air Filter','air-filters'],
      ['MIU10010','Fresh Cab Air Filter','cab-air-filters'],
      ['MIU10011','Recirculation Cab Air Filter','cab-air-filters'],
      ['LVA23443','Front PTO Filter','hydraulic-filters'],
      ['LVA13065','Hydraulic Suction Filter Element','hydraulic-filters'],
      ['LVA12726','Transmission Inline Hydraulic Oil Filter','hydraulic-filters'],
      ['TA25768','Filter Pak','maintenance-kits'],
      ['TY26668','Plus-50 II Premium 10W-30 Engine Oil','engine-oils'],
      ['TY22062','Hy-Gard Transmission / Hydraulic Oil','transmission-hydraulic-fluids'],
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
          [sourceId,guide.url,guide.externalId,guide.title,'2024-03-01'],
        );
        sourceRecordId = Number(result.insertId);
      }

      const fitments: Array<[string,string]> = [
        ['M806419',`${guide.slug.toUpperCase()} MY24- engine oil filter; 400 hours or annually`],
        ['MIA882963',`${guide.slug.toUpperCase()} MY24- spin-on fuel filter kit; 400 hours or annually`],
        ['MIU803127',`${guide.slug.toUpperCase()} MY24- fuel filter element; 400 hours or annually`],
        ['MIA885324',`${guide.slug.toUpperCase()} MY24- fuel/water separator kit; 400 hours or annually`],
        ['MIU802421',`${guide.slug.toUpperCase()} MY24- fuel/water separator element; 400 hours or annually`],
        ['RE68048',`${guide.slug.toUpperCase()} MY24- primary air filter; 600 hours or annually`],
        ['RE68049',`${guide.slug.toUpperCase()} MY24- secondary air filter; 600 hours or annually`],
        ['MIU10010',`${guide.slug.toUpperCase()} MY24- cab fresh air filter; 50 hours when cab equipped`],
        ['MIU10011',`${guide.slug.toUpperCase()} MY24- cab recirculation air filter; 50 hours when cab equipped`],
        ['LVA23443',`${guide.slug.toUpperCase()} MY24- front PTO filter; 400 hours`],
        ['LVA13065',`${guide.slug.toUpperCase()} MY24- hydraulic suction filter; 400 hours`],
        ['LVA12726',`${guide.slug.toUpperCase()} MY24- transmission inline hydraulic filter; 400 hours`],
        ['TA25768',`${guide.slug.toUpperCase()} MY24- filter maintenance kit`],
        ['TY26668',`${guide.slug.toUpperCase()} MY24- Plus-50 II 10W-30 engine oil; ${guide.engineOilL} L with filter`],
        ['TY22062',`${guide.slug.toUpperCase()} MY24- Hy-Gard; HST 26.4 L, PowrReverser 24.5 L, front axle 4.8 L`],
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
        { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', part:'TY26668', hours:400, months:12, capacity:guide.engineOilL, unit:'L', text:'Every 400 hours or annually, whichever comes first', notes:`John Deere Plus-50 II Premium 10W-30; ${guide.engineOilL} L with filter.` },
        { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'M806419', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually, whichever comes first', notes:null },
        { key:'spin-on-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Spin-on fuel filter', part:'MIA882963', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'Guide lists MIU803127 as the filter element.' },
        { key:'fuel-water-separator', section:'Fuel & Air', action:'Replace', title:'Fuel / water separator', part:'MIA885324', hours:400, months:12, capacity:null, unit:null, text:'Every 400 hours or annually', notes:'Guide lists MIU802421 as the filter element.' },
        { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', part:'RE68048', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
        { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', part:'RE68049', hours:600, months:12, capacity:null, unit:null, text:'Every 600 hours or annually', notes:null },
        { key:'cab-fresh-air-filter', section:'Cab', action:'Service / replace', title:'Cab fresh air filter', part:'MIU10010', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:'If equipped with cab.' },
        { key:'cab-recirculation-filter', section:'Cab', action:'Service / replace', title:'Cab recirculation air filter', part:'MIU10011', hours:50, months:null, capacity:null, unit:null, text:'Every 50 hours', notes:'If equipped with cab.' },
        { key:'front-pto-filter', section:'Hydraulics', action:'Replace', title:'Front PTO filter', part:'LVA23443', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:null },
        { key:'hydraulic-suction-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic suction filter element', part:'LVA13065', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:null },
        { key:'transmission-inline-filter', section:'Transmission', action:'Replace', title:'Transmission inline hydraulic oil filter', part:'LVA12726', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:null },
        { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission and hydraulic oil', part:'TY22062', hours:400, months:null, capacity:null, unit:null, text:'Every 400 hours', notes:'Capacity depends on transmission: HST 26.4 L (7.0 gal), PowrReverser 24.5 L (6.5 gal).' },
        { key:'front-axle-oil', section:'Axle', action:'Change', title:'Front axle oil', part:'TY22062', hours:600, months:null, capacity:4.8, unit:'L', text:'Every 600 hours', notes:'John Deere Hy-Gard; 4.8 L (1.3 gal).' },
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
        ['engine-oil','Engine oil','',guide.engineOilL,'L','John Deere Plus-50 II Premium 10W-30','With filter.'],
        ['transmission-hydraulic-hst','Transmission and hydraulic system','HST',26.4,'L','John Deere Hy-Gard','7.0 US gal.'],
        ['transmission-hydraulic-prt','Transmission and hydraulic system','PowrReverser',24.5,'L','John Deere Hy-Gard','6.5 US gal.'],
        ['front-axle','Front axle','MFWD',4.8,'L','John Deere Hy-Gard','1.3 US gal.'],
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
