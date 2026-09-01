import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Correction = {
  machineSlug: string;
  sourceExternalId: string;
  value: string;
};

const VERSION = 'united-states-current-2026-catalog';
const corrections: Correction[] = [
  {
    machineSlug: 'rtv-x-cab',
    sourceExternalId: 'kubota-rtv-x-cab-utility-vehicle-us-2026-catalog',
    value: '1,102 lb',
  },
  {
    machineSlug: 'rtv-x-crew',
    sourceExternalId: 'kubota-rtv-x-crew-utility-vehicle-us-2026-catalog',
    value: '1,102 lb (long bed position) / 661 lb (short bed position)',
  },
  {
    machineSlug: 'rtv-x-long-bed',
    sourceExternalId: 'kubota-rtv-x-long-bed-utility-vehicle-us-2026-catalog',
    value: '1,212 lb',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Kubota RTV-X cargo-capacity correction dependency missing');
  return Number(rows[0].id);
}

export const kubotaRtvXCargoCapacitySemanticsMigration: DbMigration = {
  id: '20260901_570_kubota_rtv_x_cargo_capacity_semantics',
  description: 'Keep Kubota RTV-X 2026 catalog Cargo Capacity distinct from Cargo Bed Load terminology',
  async apply(c) {
    await c.query(
      `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
       VALUES('Utility Vehicle Performance','kubota.utility_vehicle.cargo_capacity','Cargo capacity','text',NULL,11)
       ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    );

    const cargoCapacityDefinitionId = await id(
      c,
      `SELECT id FROM spec_definitions WHERE spec_key='kubota.utility_vehicle.cargo_capacity' LIMIT 1`,
    );
    const cargoBedLoadDefinitionId = await id(
      c,
      `SELECT id FROM spec_definitions WHERE spec_key='kubota.utility_vehicle.cargo_bed_load' LIMIT 1`,
    );
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='utility-vehicle' LIMIT 1`);

    for (const correction of corrections) {
      const machineId = await id(
        c,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, correction.machineSlug],
      );
      const versionId = await id(
        c,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION],
      );
      const sourceRecordId = await id(
        c,
        `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
        [correction.sourceExternalId],
      );

      await c.query(
        `DELETE FROM machine_specs
         WHERE machine_id=? AND machine_version_id=? AND spec_definition_id=?`,
        [machineId, versionId, cargoBedLoadDefinitionId],
      );

      await c.query(
        `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
         VALUES(?,?,?,?,NULL,NULL,?,'official')
         ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, versionId, cargoCapacityDefinitionId, correction.value, sourceRecordId],
      );
    }
  },
};