import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://jdparts.deere.com/partsmkt/unsecured/document/english/checklst/5M_Series_5075M_5090M_5100M_5115M_and_5125M_FT4_Tractors.pdf';
const SOURCE_EXTERNAL_ID = 'jd-5m-ft4-filter-overview-2021-12';
const VERSION_SLUG = 'north-america-ft4-service-guide-2021-12';

const partSeeds = [
  ['RE504836','Engine Oil Filter','engine-oil-filters'],
  ['SU20768','Primary Air Filter','air-filters'],
  ['RE253519','Secondary Air Filter','air-filters'],
  ['DZ115391','Primary Fuel Filter','fuel-filters'],
  ['DZ115390','Final Fuel Filter','fuel-filters'],
  ['SJ11784','Hydraulic / Transmission Oil Filter','hydraulic-filters'],
  ['DZ105796','Open Crankcase Ventilation Filter','engine-breather-filters'],
  ['DZ105100','Open Crankcase Ventilation Filter','engine-breather-filters'],
  ['DZ114640','DEF Injection Pump Filter','emissions-filters'],
  ['DZ104592','Diesel Particulate Filter','emissions-filters'],
  ['RE198488','Fresh Cab Air Filter','cab-air-filters'],
  ['RE195491','Recirculation Cab Air Filter','cab-air-filters'],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 5125M FT4 migration dependency.');
  return Number(rows[0].id);
}

export const johnDeere5125MFT4VersionedMaintenanceMigration: DbMigration = {
  id: '20260827_124_5125m_ft4_versioned_maintenance',
  description: 'Add Dec 2021 North America FT4 5125M service data as a separate historical machine version',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='john-deere' AND m.slug='5125m'
      LIMIT 1
    `);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Engine Breather Filters','engine-breather-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Emissions Filters','emissions-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date)
         VALUES (?,?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'John Deere 5M Series FT4 Filter Overview with Service Intervals and Capacities - 5125M',
          '2021-12-01',
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO machine_versions (
        machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes
      ) VALUES (?,?,'NA','North America',?,FALSE,?,?)
      ON DUPLICATE KEY UPDATE
        market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),
        is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [
        machineId,
        VERSION_SLUG,
        '5125M Final Tier 4 service-guide generation',
        sourceRecordId,
        'John Deere filter overview released December 2021. This source does not state model-year or serial-number boundaries, so these service facts are intentionally kept separate from the current 2025 ALDI specification version.',
      ],
    );
    const machineVersionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,VERSION_SLUG]);

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

    const fitments = [
      { number:'RE504836', note:'5125M FT4 engine oil filter; change every 500 hours or annually.' },
      { number:'SU20768', note:'5125M FT4 primary air filter; service every 1000 hours or annually and as conditions require.' },
      { number:'RE253519', note:'5125M FT4 secondary air filter; service every 1000 hours or annually and as conditions require.' },
      { number:'DZ115391', note:'5125M FT4 primary fuel filter; change every 500 hours or annually.' },
      { number:'DZ115390', note:'5125M FT4 final fuel filter; change every 500 hours or annually.' },
      { number:'SJ11784', note:'5125M FT4 hydraulic oil filter; first 100 hours, every 500 hours through 1500 hours, then at 1500-hour intervals.' },
      { number:'DZ105796', note:'5125M FT4 OCV filter for engine with diesel oxidation catalyst only.', configuration:'Diesel oxidation catalyst only' },
      { number:'DZ105100', note:'5125M FT4 OCV filter for engine with diesel oxidation catalyst and diesel particulate filter.', configuration:'Diesel oxidation catalyst + DPF' },
      { number:'DZ114640', note:'5125M FT4 DEF injection pump filter; replace every 4500 hours or 5 years.' },
      { number:'DZ104592', note:'5125M FT4 diesel particulate filter; replace as required.', configuration:'DPF-equipped engine' },
      { number:'RE198488', note:'5125M FT4 fresh cab air filter; clean every 500 hours or annually and as conditions require.', configuration:'Cab', quantity:2 },
      { number:'RE195491', note:'5125M FT4 recirculation cab air filter; clean every 500 hours or annually and as conditions require.', configuration:'Cab', quantity:2 },
    ] as const;

    for (const fitment of fitments) {
      const pid = await partId(fitment.number);
      const configuration = 'configuration' in fitment ? fitment.configuration : null;
      const quantity = 'quantity' in fitment ? fitment.quantity : null;
      const [existing] = await connection.query<IdRow[]>(`
        SELECT id FROM machine_parts
        WHERE machine_id=? AND machine_version_id=? AND part_id=?
          AND COALESCE(configuration_note,'')=COALESCE(?,'')
          AND fitment_note=?
        LIMIT 1
      `, [machineId,machineVersionId,pid,configuration,fitment.note]);

      if (existing[0]) {
        await connection.query(
          `UPDATE machine_parts SET quantity=?,source_record_id=? WHERE id=?`,
          [quantity,sourceRecordId,Number(existing[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (
            machine_id,machine_version_id,part_id,fitment_note,quantity,configuration_note,source_record_id
          ) VALUES (?,?,?,?,?,?,?)`,
          [machineId,machineVersionId,pid,fitment.note,quantity,configuration,sourceRecordId],
        );
      }
    }

    const tasks = [
      { key:'ft4-engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', part:'RE504836', hours:500, months:12, initial:null, text:'Every 500 hours or annually, whichever comes first', notes:null },
      { key:'ft4-primary-air-filter', section:'Fuel & Air', action:'Service / replace', title:'Primary air filter', part:'SU20768', hours:1000, months:12, initial:null, text:'Every 1000 hours or annually, and as conditions require', notes:null },
      { key:'ft4-secondary-air-filter', section:'Fuel & Air', action:'Service / replace', title:'Secondary air filter', part:'RE253519', hours:1000, months:12, initial:null, text:'Every 1000 hours or annually, and as conditions require', notes:null },
      { key:'ft4-primary-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Primary fuel filter', part:'DZ115391', hours:500, months:12, initial:null, text:'Every 500 hours or annually, whichever comes first', notes:null },
      { key:'ft4-final-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Final fuel filter', part:'DZ115390', hours:500, months:12, initial:null, text:'Every 500 hours or annually, whichever comes first', notes:null },
      { key:'ft4-hydraulic-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', part:'SJ11784', hours:null, months:null, initial:100, text:'First 100 hours; then every 500 hours through 1500 hours; then every 1500 hours', notes:'The source uses a stepped interval, so no single repeating interval is asserted.' },
      { key:'ft4-ocv-doc-clean', section:'Engine', action:'Clean', title:'OCV filter - DOC only', part:'DZ105796', hours:500, months:12, initial:null, text:'Every 500 hours or annually', notes:'Applies to engine with diesel oxidation catalyst only.' },
      { key:'ft4-ocv-doc-replace', section:'Engine', action:'Replace', title:'OCV filter - DOC only', part:'DZ105796', hours:1500, months:36, initial:null, text:'Every 1500 hours or 3 years, whichever comes first', notes:'Applies to engine with diesel oxidation catalyst only.' },
      { key:'ft4-ocv-dpf-clean', section:'Engine', action:'Clean', title:'OCV filter - DOC + DPF', part:'DZ105100', hours:500, months:12, initial:null, text:'Every 500 hours or annually', notes:'Applies to engine with diesel oxidation catalyst and diesel particulate filter.' },
      { key:'ft4-ocv-dpf-replace', section:'Engine', action:'Replace', title:'OCV filter - DOC + DPF', part:'DZ105100', hours:1500, months:36, initial:null, text:'Every 1500 hours or 3 years, whichever comes first', notes:'Applies to engine with diesel oxidation catalyst and diesel particulate filter.' },
      { key:'ft4-def-injection-filter', section:'Engine', action:'Replace', title:'DEF injection pump filter', part:'DZ114640', hours:4500, months:60, initial:null, text:'Every 4500 hours or 5 years, whichever comes first', notes:null },
      { key:'ft4-dpf', section:'Engine', action:'Replace as required', title:'Diesel particulate filter', part:'DZ104592', hours:null, months:null, initial:null, text:'As required', notes:'DPF-equipped engine.' },
      { key:'ft4-fresh-cab-filter', section:'Cab', action:'Clean', title:'Fresh cab air filter', part:'RE198488', hours:500, months:12, initial:null, text:'Every 500 hours or annually, and as conditions require', notes:'Quantity 2.' },
      { key:'ft4-recirculation-cab-filter', section:'Cab', action:'Clean', title:'Recirculation cab air filter', part:'RE195491', hours:500, months:12, initial:null, text:'Every 500 hours or annually, and as conditions require', notes:'Quantity 2.' },
    ] as const;

    for (const task of tasks) {
      const pid = await partId(task.part);
      await connection.query(
        `INSERT INTO maintenance_tasks (
          machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
          initial_interval_hours,interval_text,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          machine_version_id=VALUES(machine_version_id),section=VALUES(section),action=VALUES(action),title=VALUES(title),
          part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),
          initial_interval_hours=VALUES(initial_interval_hours),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
        [
          machineId,machineVersionId,task.key,task.section,task.action,task.title,pid,
          task.hours,task.months,task.initial,task.text,task.notes,sourceRecordId,
        ],
      );
    }

    const capacities = [
      { key:'ft4-fuel-tank', label:'Fuel tank', config:'5125M FT4', value:160.5, unit:'L', fluid:null, notes:'Approx. 42.4 US gal.' },
      { key:'ft4-cooling-system', label:'Cooling system', config:'5125M FT4', value:22, unit:'L', fluid:'John Deere Cool-Gard II', notes:'Approx. 5.8 US gal.' },
      { key:'ft4-engine-oil', label:'Engine oil', config:'5125M FT4', value:13, unit:'L', fluid:'John Deere Plus-50 II', notes:'Crankcase with filter; approx. 3.4 US gal.' },
      { key:'ft4-transmission-hydraulic', label:'Transmission and hydraulic system', config:'5125M FT4', value:39.5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 10.4 US gal.' },
      { key:'ft4-mfwd-differential', label:'MFWD differential housing', config:'MFWD · 5125M FT4', value:5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 1.3 US gal.' },
      { key:'ft4-mfwd-hub', label:'MFWD wheel hub', config:'Each hub · 5125M FT4', value:0.8, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 0.2 US gal per hub.' },
      { key:'ft4-def-tank', label:'DEF tank', config:'5125M FT4', value:12.1, unit:'L', fluid:'Diesel Exhaust Fluid', notes:'Approx. 3.2 US gal.' },
    ] as const;

    for (const capacity of capacities) {
      await connection.query(
        `INSERT INTO machine_capacities (
          machine_id,machine_version_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          machine_version_id=VALUES(machine_version_id),label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),
          fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
        [
          machineId,machineVersionId,capacity.key,capacity.label,capacity.config,capacity.value,capacity.unit,
          capacity.fluid,capacity.notes,sourceRecordId,
        ],
      );
    }
  },
};
