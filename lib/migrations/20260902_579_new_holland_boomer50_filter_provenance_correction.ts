import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LIST_A_EXTERNAL_ID = 'new-holland-boomer-tier4b-na-initial-stocking-filters-2026-09';
const LIST_B_EXTERNAL_ID = 'new-holland-boomer-tier4b-na-initial-stocking-list-b-2026-09';
const OLD_PRIMARY_NOTE = 'Primary/outer engine air filter for Tier 4B Boomer 50 applications. Official CNH catalog identity; verify serial/build date before ordering.';
const NEW_PRIMARY_NOTE = 'Primary/outer engine air filter listed in the official MyCNH North America Tier 4B Boomer Initial Stocking List B. Verify serial/build date and air-cleaner configuration before ordering.';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer 50 provenance correction dependency.');
  return Number(rows[0].id);
}

export const newHollandBoomer50FilterProvenanceCorrectionMigration: DbMigration = {
  id: '20260902_579_new_holland_boomer50_filter_provenance_correction',
  description: 'Correct Boomer 50 primary air-filter provenance from MyCNH Initial Stocking List A to List B',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='boomer-50' LIMIT 1`,
    );
    const primaryAirFilterId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40007576' LIMIT 1`,
      [manufacturerId],
    );
    const listASourceRecordId = await selectId(
      connection,
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [LIST_A_EXTERNAL_ID],
    );
    const listBSourceRecordId = await selectId(
      connection,
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [LIST_B_EXTERNAL_ID],
    );

    const [fitmentUpdate] = await connection.query<ResultSetHeader>(
      `UPDATE machine_parts
       SET source_record_id=?, fitment_note=?
       WHERE machine_id=? AND part_id=? AND source_record_id=? AND fitment_note=?`,
      [listBSourceRecordId, NEW_PRIMARY_NOTE, machineId, primaryAirFilterId, listASourceRecordId, OLD_PRIMARY_NOTE],
    );
    if (fitmentUpdate.affectedRows !== 1) {
      throw new Error(`Expected to correct exactly one Boomer 50 MT40007576 fitment, updated ${fitmentUpdate.affectedRows}.`);
    }

    const [sourceUpdate] = await connection.query<ResultSetHeader>(
      `UPDATE source_records
       SET title=?, raw_reference=?
       WHERE id=?`,
      [
        'New Holland MyCNH North America Tier 4B Boomer Initial Stocking List A',
        JSON.stringify({
          modelScope: 'North America Tier 4B Boomer compact tractors; individual machine fitment remains constrained by model/configuration notes',
          catalogPage: '05.100.10 - INITIAL STOCKING LIST (LIST A)',
          explicitCatalogNote: 'MT40007638 suction-line note names BOOMER 40 and BOOMER 50 and references replacement filter MT40347273.',
          filters: [
            { partNumber: 'MT40318591', name: 'Engine Oil Filter' },
            { partNumber: 'MT40271228', name: 'Fuel Filter' },
            { partNumber: 'MT40049446', name: 'Safety Engine Air Filter' },
            { partNumber: 'MT40007563', name: 'HST Hydraulic Oil Filter' },
            { partNumber: 'MT40007638', name: 'Hydraulic Suction / Transmission Filter' },
            { partNumber: 'MT40032863', name: 'Cab Air Filter' },
          ],
          provenanceCorrection: 'MT40007576 Primary Engine Air Filter is supported by Initial Stocking List B and is no longer attributed to this List A source record.',
        }),
        listASourceRecordId,
      ],
    );
    if (sourceUpdate.affectedRows !== 1) {
      throw new Error(`Expected to correct exactly one Boomer List A source record, updated ${sourceUpdate.affectedRows}.`);
    }
  },
};
