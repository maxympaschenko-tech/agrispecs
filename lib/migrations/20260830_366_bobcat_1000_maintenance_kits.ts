import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type KitSeed = {
  partNumber: string;
  hours: number;
  url: string;
  includedParts: string[];
};

const VERSION = 'united-states-current-2026-08';
const machineSlugs = ['ct1021-hst', 'ct1025-hst'];

const kits: KitSeed[] = [
  {
    partNumber: '7417129',
    hours: 50,
    url: 'https://shop.bobcat.com/50-hour-maintenance-kit-7417129',
    includedParts: ['7378026 hydrostatic filter', '7378013 hydraulic filter', '6694509 engine oil filter'],
  },
  {
    partNumber: '7417131',
    hours: 200,
    url: 'https://shop.bobcat.com/200-hour-maintenance-kit-7417131',
    includedParts: ['7378026 hydrostatic filter', '7378013 hydraulic filter', '6694509 engine oil filter', '7412186 fuel filter'],
  },
  {
    partNumber: '7417132',
    hours: 500,
    url: 'https://shop.bobcat.com/500-hour-maintenance-kit-7417132',
    includedParts: ['6694509 engine oil filter', '7382879 outer air filter'],
  },
  {
    partNumber: '7417133',
    hours: 800,
    url: 'https://shop.bobcat.com/800-hour-maintenance-kit-7417133',
    includedParts: ['6694509 engine oil filter', '6694700 arm rocker gasket', '7378026 hydrostatic filter', '7378013 hydraulic oil filter', '7412186 fuel filter'],
  },
  {
    partNumber: '7417134',
    hours: 1000,
    url: 'https://shop.bobcat.com/1000-hour-maintenance-kit-7417134',
    includedParts: ['6694509 engine oil filter', '7378026 hydrostatic filter', '7378013 hydraulic oil filter', '7382879 outer air filter', '7412186 fuel filter'],
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Bobcat 1000 Platform maintenance-kit migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number, kit: KitSeed) {
  const externalId = `bobcat-${kit.partNumber}-${kit.hours}h-1000-platform-maintenance-kit-current-us-2026-08`;
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      kit.url,
      externalId,
      `Bobcat ${kit.hours} Hour Maintenance Kit ${kit.partNumber} for CT1021 / CT1025`,
      JSON.stringify({
        market: 'United States',
        captured: '2026-08-30',
        serviceMilestoneHours: kit.hours,
        modelCompatibility: ['CT1021', 'CT1025'],
        includedParts: kit.includedParts,
        sourcePolicy: 'Bobcat Shop explicitly identifies this hour milestone as routine maintenance for CT1021 and CT1025. Kit contents are recorded only as contents of the official kit; they are not converted into independent recurring component replacement intervals. Bobcat notes that parts can vary by serial number.',
      }),
    ],
  );
  return Number(inserted.insertId);
}

export const bobcat1000MaintenanceKitsMigration: DbMigration = {
  id: '20260830_366_bobcat_1000_maintenance_kits',
  description: 'Add official Bobcat US maintenance-kit parts and service milestones for CT1021 and CT1025',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);

    await c.query(`INSERT INTO part_categories(name,slug) VALUES('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await id(c, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    await c.query(
      `INSERT INTO part_categories(parent_id,name,slug) VALUES(?,'Maintenance Kits','maintenance-kits')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    const maintenanceKitsId = await id(c, `SELECT id FROM part_categories WHERE slug='maintenance-kits' LIMIT 1`);

    for (const kit of kits) {
      const sourceRecordId = await ensureSourceRecord(c, sourceId, kit);

      await c.query(
        `INSERT INTO parts(manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES(?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status='verified'`,
        [manufacturerId, maintenanceKitsId, kit.partNumber, kit.partNumber, `${kit.hours} Hour Maintenance Kit`],
      );
      const partId = await id(
        c,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, kit.partNumber],
      );

      for (const machineSlug of machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
        const fitmentNote = `Official Bobcat ${kit.hours}-hour maintenance kit for CT1021 / CT1025; verify serial-number-specific contents in the Bobcat Online Parts Catalog.`;

        const [existingFitment] = await c.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId, partId, fitmentNote],
        );
        if (!existingFitment[0]) {
          await c.query(
            `INSERT INTO machine_parts(machine_id,part_id,fitment_note,source_record_id) VALUES(?,?,?,?)`,
            [machineId, partId, fitmentNote, sourceRecordId],
          );
        }

        await c.query(
          `INSERT INTO maintenance_tasks(
             machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
             initial_interval_hours,interval_text,notes,source_record_id,confidence
           ) VALUES(?,? ,?,'Maintenance','Service',?,?,NULL,NULL,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE
             machine_version_id=VALUES(machine_version_id),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
             interval_hours=NULL,interval_months=NULL,initial_interval_hours=VALUES(initial_interval_hours),
             interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
          [
            machineId,
            versionId,
            `scheduled-service-${kit.hours}h`,
            `${kit.hours}-hour routine maintenance`,
            partId,
            kit.hours,
            `At ${kit.hours} hours`,
            `Bobcat Shop identifies this as a routine-maintenance milestone for CT1021 and CT1025 and lists maintenance kit ${kit.partNumber}. Included kit components: ${kit.includedParts.join('; ')}. The kit contents are not treated here as separate recurring replacement intervals. Parts can vary by tractor serial number.`,
            sourceRecordId,
          ],
        );
      }
    }
  },
};
