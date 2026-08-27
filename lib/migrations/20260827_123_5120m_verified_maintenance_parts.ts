import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type PartSeed = {
  number: string;
  name: string;
  category: string;
  categoryName?: string;
};

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/5-5120m-north-america-edition.pdf';
const SOURCE_EXTERNAL_ID = 'jd-rpg-5120m-na-2022-12';

const partSeeds: PartSeed[] = [
  { number:'RE504836', name:'Engine Oil Filter', category:'engine-oil-filters' },
  { number:'TR129895', name:'Primary Air Filter', category:'air-filters' },
  { number:'TR129896', name:'Secondary Air Filter', category:'air-filters' },
  { number:'DZ115391', name:'Primary Fuel Filter', category:'fuel-filters' },
  { number:'DZ115390', name:'Final Fuel Filter', category:'fuel-filters' },
  { number:'SJ11784', name:'Hydraulic / Transmission Oil Filter', category:'hydraulic-filters' },
  { number:'RE198488', name:'Fresh Cab Air Filter', category:'cab-air-filters' },
  { number:'RE195491', name:'Recirculation Cab Air Filter', category:'cab-air-filters' },
  { number:'AXE66451', name:'Battery - 12 V', category:'batteries', categoryName:'Batteries' },
  { number:'DZ123153', name:'Alternator - 90 A', category:'alternators', categoryName:'Alternators' },
  { number:'RE554568', name:'Alternator - 120 A', category:'alternators', categoryName:'Alternators' },
  { number:'RE555751', name:'Alternator - 200 A', category:'alternators', categoryName:'Alternators' },
  { number:'SJ27050', name:'Brake Disk', category:'brake-parts', categoryName:'Brake Parts' },
  { number:'TR126196', name:'Fan Drive Belt - 841 mm', category:'drive-belts', categoryName:'Drive Belts' },
  { number:'TR126197', name:'Fan Drive Belt - 664 mm', category:'drive-belts', categoryName:'Drive Belts' },
  { number:'SJ20988', name:'PTO Clutch Disk', category:'clutch-parts', categoryName:'Clutch Parts' },
  { number:'RE271437', name:'Tie Rod Assembly', category:'steering-parts', categoryName:'Steering Parts' },
  { number:'RE271440', name:'Steering Ball Joint', category:'steering-parts', categoryName:'Steering Parts' },
  { number:'RE271441', name:'90 Degree Steering Joint', category:'steering-parts', categoryName:'Steering Parts' },
  { number:'RE217616', name:'Tie Rod Assembly', category:'steering-parts', categoryName:'Steering Parts' },
  { number:'RE217817', name:'Tie Rod End', category:'steering-parts', categoryName:'Steering Parts' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 5120M migration dependency.');
  return Number(rows[0].id);
}

export const johnDeere5120MVerifiedMaintenancePartsMigration: DbMigration = {
  id: '20260827_123_5120m_verified_maintenance_parts',
  description: 'Add official North America 5120M maintenance intervals, fluid capacities and wear/electrical replacement parts',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='john-deere' AND m.slug='5120m' LIMIT 1
    `);

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
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere 5120M Tractors North America Replacement Parts Guide','2022-12-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const part of partSeeds) {
      if (part.categoryName) {
        await connection.query(
          `INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
          [part.categoryName,part.category],
        );
      }
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [part.category]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number,part.name],
      );
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,number]);
    }

    const fitments: Array<{number:string; note:string; configuration?:string}> = [
      { number:'RE504836', note:'5120M engine oil filter; replace every 500 hours.' },
      { number:'TR129895', note:'5120M primary air filter element; replace every 1000 hours.' },
      { number:'TR129896', note:'5120M secondary air filter element; replace every 1000 hours.' },
      { number:'DZ115391', note:'5120M primary fuel filter; replace every 500 hours.' },
      { number:'DZ115390', note:'5120M final fuel filter; replace every 500 hours.' },
      { number:'SJ11784', note:'5120M hydraulic-transmission oil filter; replace at first 100 hours, then every 500 hours.' },
      { number:'RE198488', note:'5120M fresh cab air filter listed in the official North America guide.', configuration:'Cab' },
      { number:'RE195491', note:'5120M recirculation cab air filter listed in the official North America guide.', configuration:'Cab' },
      { number:'AXE66451', note:'5120M 12 V battery listed in the official North America guide.' },
      { number:'DZ123153', note:'5120M 90 A alternator option.', configuration:'90 A · 14 V' },
      { number:'RE554568', note:'5120M 120 A alternator option.', configuration:'120 A · 14.5 V' },
      { number:'RE555751', note:'5120M 200 A alternator option.', configuration:'200 A · 12 V' },
      { number:'SJ27050', note:'5120M brake disk listed in the official North America guide.' },
      { number:'TR126196', note:'5120M fan drive belt.', configuration:'841 mm' },
      { number:'TR126197', note:'5120M fan drive belt.', configuration:'664 mm' },
      { number:'SJ20988', note:'5120M clutch disk listed in the official North America guide.', configuration:'PTO' },
      { number:'RE271437', note:'5120M MFWD tie rod assembly.', configuration:'MFWD front axle' },
      { number:'RE271440', note:'5120M MFWD steering ball joint.', configuration:'MFWD front axle' },
      { number:'RE271441', note:'5120M MFWD 90 degree steering joint.', configuration:'MFWD front axle' },
      { number:'RE217616', note:'5120M 2WD tie rod assembly.', configuration:'2WD front axle' },
      { number:'RE217817', note:'5120M Carraro tie rod end.', configuration:'2WD / Carraro' },
    ];

    for (const fitment of fitments) {
      const pid = await partId(fitment.number);
      const [existing] = await connection.query<IdRow[]>(`
        SELECT id FROM machine_parts
        WHERE machine_id=? AND part_id=?
          AND COALESCE(configuration_note,'')=COALESCE(?,'')
          AND fitment_note=? LIMIT 1
      `, [machineId,pid,fitment.configuration ?? null,fitment.note]);
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
           VALUES (?,?,?,?,?)`,
          [machineId,pid,fitment.note,fitment.configuration ?? null,sourceRecordId],
        );
      }
    }

    const tasks = [
      { key:'engine-oil-filter', section:'Engine', title:'Engine oil filter', part:'RE504836', hours:500, initial:null, text:'Every 500 hours' },
      { key:'primary-air-filter', section:'Fuel & Air', title:'Primary air filter element', part:'TR129895', hours:1000, initial:null, text:'Every 1000 hours' },
      { key:'secondary-air-filter', section:'Fuel & Air', title:'Secondary air filter element', part:'TR129896', hours:1000, initial:null, text:'Every 1000 hours' },
      { key:'primary-fuel-filter', section:'Fuel & Air', title:'Primary fuel filter', part:'DZ115391', hours:500, initial:null, text:'Every 500 hours' },
      { key:'final-fuel-filter', section:'Fuel & Air', title:'Final fuel filter', part:'DZ115390', hours:500, initial:null, text:'Every 500 hours' },
      { key:'hydraulic-transmission-filter', section:'Transmission', title:'Hydraulic-transmission oil filter', part:'SJ11784', hours:500, initial:100, text:'After the first 100 hours, then every 500 hours' },
    ] as const;

    for (const task of tasks) {
      const pid = await partId(task.part);
      await connection.query(
        `INSERT INTO maintenance_tasks (
          machine_id,task_key,section,action,title,part_id,interval_hours,initial_interval_hours,interval_text,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
          interval_hours=VALUES(interval_hours),initial_interval_hours=VALUES(initial_interval_hours),interval_text=VALUES(interval_text),confidence='official'`,
        [machineId,task.key,task.section,'Replace',task.title,pid,task.hours,task.initial,task.text,sourceRecordId],
      );
    }

    const capacities = [
      { key:'engine-oil', label:'Engine oil', config:'', value:12, unit:'L', fluid:'John Deere Plus-50 II', notes:'Approx. 3.2 US gal.' },
      { key:'transmission-hydraulic', label:'Transmission and hydraulic axle oil', config:'', value:39.5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 10.4 US gal.' },
      { key:'mfwd-axle', label:'MFWD axle oil', config:'MFWD', value:5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 1.3 US gal.' },
      { key:'mfwd-hub', label:'MFWD hub oil', config:'Each hub', value:0.8, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approx. 0.2 US gal per hub.' },
    ] as const;

    for (const capacity of capacities) {
      await connection.query(
        `INSERT INTO machine_capacities (
          machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
        [machineId,capacity.key,capacity.label,capacity.config,capacity.value,capacity.unit,capacity.fluid,capacity.notes,sourceRecordId],
      );
    }

    await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`, [machineId]);
  },
};
