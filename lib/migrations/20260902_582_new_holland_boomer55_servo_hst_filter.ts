import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const MYCNH_URL = 'https://www.mycnhstore.com/es/es/newhollandag/eu/tractores/compacto/euba17com227boomer/cab-compact-tractor-stage-5/servicio-de-mantenimiento/lista-de-inventario-inicial-lista-a/cn/B5E23F2D-17AA-4B7E-B4B9-D3D55C25E002/620248D4-29F0-4F58-9FA6-BB12237AB878';
const MYCNH_EXTERNAL_ID = 'new-holland-mt40383187-servo-hst-oem-identity-2026-09';
const MESSICKS_URL = 'https://www.messicks.com/parts/new-holland/mt40383187';
const MESSICKS_EXTERNAL_ID = 'messicks-new-holland-mt40383187-boomer55-servo-hst-2026-09';
const CURRENT_VERSION = 'united-states-current-2026-08';
const CONFIGURATION_NOTE = 'Cab-equipped Servo HST Tier 4B North America';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer 55 Servo HST filter dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandBoomer55ServoHstFilterMigration: DbMigration = {
  id: '20260902_582_new_holland_boomer55_servo_hst_filter',
  description: 'Add verified New Holland MT40383187 Servo HST hydraulic filter and exact Boomer 55 Cab Tier 4B fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const hydraulicCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);
    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    const supplierSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name=? AND domain='messicks.com' AND source_type='supplier' ORDER BY id LIMIT 1`,
      ["Messick's"],
    );

    const oemSourceRecordId = await ensureSourceRecord(
      connection,
      officialSourceId,
      MYCNH_EXTERNAL_ID,
      MYCNH_URL,
      'New Holland MyCNH MT40383187 Servo HST hydraulic filter identity',
      {
        partNumber: 'MT40383187',
        description: 'FILTER-HYDRAULIC-TR640 - FOR SERVO HST',
        role: 'OEM part identity and Servo HST function only',
        guardrail: 'This European/Stage 5 MyCNH record is not used as evidence of North American Boomer 55 fitment.',
      },
    );

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      supplierSourceId,
      MESSICKS_EXTERNAL_ID,
      MESSICKS_URL,
      `Messick's New Holland MT40383187 Boomer 55 Servo HST fitment`,
      {
        partNumber: 'MT40383187',
        model: 'Boomer 55',
        configuration: 'Compact Tractor w/Cab - Tier 4B (NA); Servo-control HST',
        catalogPath: '21.109.030 - HST FILTER & LINE SERVO-CONTROL',
        role: 'Exact North America model/configuration fitment evidence',
        oemSourceRecordId,
        dateGuardrail: 'No post-01-Sep-2022 cutover is asserted because the exact MT40383187 fitment entry does not state one.',
      },
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        manufacturerId,
        hydraulicCategoryId,
        'MT40383187',
        'MT40383187',
        'Servo HST Hydraulic Filter Element',
        'New Holland hydraulic filter element for Servo HST applications. OEM function is documented by MyCNH; exact Boomer 55 Cab Tier 4B North America fitment is supported by the supplier parts catalog.',
      ],
    );

    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40383187' LIMIT 1`,
      [manufacturerId],
    );
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='boomer-55' LIMIT 1`,
    );
    const machineVersionId = await selectId(
      connection,
      `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
      [machineId, CURRENT_VERSION],
    );
    const fitmentNote = 'Servo HST hydraulic filter element for cab-equipped New Holland Boomer 55 Tier 4B North America. Exact catalog path: HST FILTER & LINE SERVO-CONTROL. This relation is not generalized to ROPS or non-Servo HST configurations.';

    const [existing] = await connection.query<IdRow[]>(
      `SELECT id FROM machine_parts
       WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
      [machineId, partId, machineVersionId, CONFIGURATION_NOTE],
    );
    if (!existing[0]) {
      await connection.query(
        `INSERT INTO machine_parts
         (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
         VALUES (?,?,?,?,?,'high',?)`,
        [machineId, partId, machineVersionId, CONFIGURATION_NOTE, fitmentNote, fitmentSourceRecordId],
      );
    }
  },
};
