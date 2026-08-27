import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-4066m-cut-my24-ww-edition.pdf';
const SOURCE_EXTERNAL_ID = 'jd-rpg-4066m-my24-worldwide-2024-03';

type IdRow = RowDataPacket & { id: number };

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 4066M maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere4066MMaintenanceMigration: DbMigration = {
  id: '20260827_092_4066m_maintenance',
  description: 'Add official MY24 John Deere 4066M maintenance intervals, filters and fluid capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug='4066m' LIMIT 1`,
    );

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'John Deere 4066M Compact Utility Tractor MY24 Replacement Parts Guide - Worldwide Edition', '2024-03-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const categoryMap: Record<string,string> = {
      M806419: 'engine-oil-filters',
      MIU803127: 'fuel-filters',
      RE68048: 'air-filters',
      RE68049: 'air-filters',
      MIU803221: 'fuel-filters',
      MIU802421: 'fuel-filters',
      RE45864: 'hydraulic-filters',
      LVA10419: 'hydraulic-filters',
      LVA23443: 'hydraulic-filters',
      TA25765: 'maintenance-kits',
      TY26669: 'engine-oils',
      TY22000: 'transmission-hydraulic-fluids',
      TY22035: 'transmission-hydraulic-fluids',
    };

    const names: Record<string,string> = {
      M806419: 'Engine Oil Filter',
      MIU803127: 'Spin-On Fuel Filter',
      RE68048: 'Primary Air Filter',
      RE68049: 'Secondary Air Filter',
      MIU803221: 'Fuel / Water Separator',
      MIU802421: 'Fuel / Water Separator Filter Element',
      RE45864: 'Transmission Oil Filter',
      LVA10419: 'Hydraulic Oil Filter',
      LVA23443: 'Front PTO Filter',
      TA25765: 'Filter Pak',
      TY26669: 'Plus-50 II 10W-30 Engine Oil',
      TY22000: 'Low Viscosity Hy-Gard Transmission / Hydraulic Oil',
      TY22035: 'Low Viscosity Hy-Gard Front Axle Oil',
    };

    for (const number of Object.keys(categoryMap)) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categoryMap[number]]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, number, number, names[number]],
      );
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, number]);
    }

    async function linkPart(number: string, note: string) {
      const pid = await partId(number);
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [machineId, pid, note],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
          [machineId, pid, note, sourceRecordId],
        );
      }
    }

    const fitments: Array<[string,string]> = [
      ['M806419','4066M MY24 engine oil filter; replace every 400 hours or annually'],
      ['MIU803127','4066M MY24 spin-on fuel filter; replace every 400 hours or annually'],
      ['RE68048','4066M MY24 primary air filter; replace every 600 hours or annually'],
      ['RE68049','4066M MY24 secondary air filter; replace every 600 hours or annually'],
      ['MIU803221','4066M MY24 fuel/water separator; service every 400 hours or annually'],
      ['MIU802421','4066M MY24 fuel/water separator filter element; service every 400 hours or annually'],
      ['RE45864','4066M MY24 transmission oil filter; replace every 400 hours or annually'],
      ['LVA10419','4066M MY24 hydraulic oil filter; replace every 400 hours or annually'],
      ['LVA23443','4066M MY24 front PTO filter; replace every 400 hours or annually when equipped'],
      ['TA25765','4066M MY24 filter maintenance kit'],
      ['TY26669','4066M MY24 Plus-50 II 10W-30 engine oil; 5.4 L (5.7 qt)'],
      ['TY22000','4066M MY24 transmission/hydraulic oil; 47.3 L (12.5 gal)'],
      ['TY22035','4066M MY24 front axle oil; 5.5 L standard axle or 8.0 L heavy-duty axle'],
    ];
    for (const [number,note] of fitments) await linkPart(number,note);

    type Task = {
      key: string;
      section: string;
      action: string;
      title: string;
      partNumber?: string;
      intervalHours?: number;
      intervalMonths?: number;
      capacityValue?: number;
      capacityUnit?: string;
      intervalText: string;
      notes?: string;
    };

    const tasks: Task[] = [
      { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', partNumber:'TY26669', intervalHours:400, intervalMonths:12, capacityValue:5.4, capacityUnit:'L', intervalText:'Every 400 hours or annually', notes:'John Deere Plus-50 II Premium 10W-30; capacity 5.4 L (5.7 qt).' },
      { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', partNumber:'M806419', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually, whichever comes first' },
      { key:'spin-on-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Spin-on fuel filter', partNumber:'MIU803127', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually' },
      { key:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', partNumber:'RE68048', intervalHours:600, intervalMonths:12, intervalText:'Every 600 hours or annually' },
      { key:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', partNumber:'RE68049', intervalHours:600, intervalMonths:12, intervalText:'Every 600 hours or annually' },
      { key:'fuel-water-separator', section:'Fuel & Air', action:'Replace', title:'Fuel / water separator', partNumber:'MIU803221', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually', notes:'Filter element MIU802421 is listed with the separator.' },
      { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission / hydraulic oil', partNumber:'TY22000', intervalHours:400, intervalMonths:12, capacityValue:47.3, capacityUnit:'L', intervalText:'Every 400 hours or annually', notes:'John Deere Low Viscosity Hy-Gard; capacity 47.3 L (12.5 gal).' },
      { key:'transmission-filter', section:'Transmission', action:'Replace', title:'Transmission oil filter', partNumber:'RE45864', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually' },
      { key:'hydraulic-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', partNumber:'LVA10419', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually' },
      { key:'front-pto-filter', section:'PTO', action:'Replace', title:'Front PTO filter', partNumber:'LVA23443', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually', notes:'When equipped with front PTO.' },
      { key:'front-axle-oil-standard', section:'Axle', action:'Change', title:'Front axle oil - standard axle', partNumber:'TY22035', intervalHours:600, capacityValue:5.5, capacityUnit:'L', intervalText:'Every 600 hours', notes:'Standard front axle capacity 5.5 L (5.8 qt).' },
      { key:'front-axle-oil-heavy-duty', section:'Axle', action:'Change', title:'Front axle oil - heavy-duty axle', partNumber:'TY22035', intervalHours:600, capacityValue:8.0, capacityUnit:'L', intervalText:'Every 600 hours', notes:'Heavy-duty front axle capacity 8.0 L (8.5 qt).' },
    ];

    for (const task of tasks) {
      const pid = task.partNumber ? await partId(task.partNumber) : null;
      await connection.query(
        `INSERT INTO maintenance_tasks (
          machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,
          capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
          interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),capacity_value=VALUES(capacity_value),
          capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
        [
          machineId, task.key, task.section, task.action, task.title, pid,
          task.intervalHours ?? null, task.intervalMonths ?? null,
          task.capacityValue ?? null, task.capacityUnit ?? null,
          task.intervalText, task.notes ?? null, sourceRecordId,
        ],
      );
    }
  },
};
