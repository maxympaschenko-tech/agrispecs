import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; maxHp: number; dynamicPerformanceHp?: number };

const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.fendt.com/us/products/tractors/fendt-200-vario';
const models: Seed[] = [
  { slug: '209-vario', name: '209 Vario', maxHp: 94 },
  { slug: '210-vario', name: '210 Vario', maxHp: 104 },
  { slug: '211-vario', name: '211 Vario', maxHp: 114, dynamicPerformanceHp: 124 },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Fendt 200 Vario dependency missing');
  return Number(rows[0].id);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: number) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?, 'hp',?,'official')
     ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit='hp',source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, value, sourceRecordId],
  );
}

export const fendt200VarioCurrentUsMigration: DbMigration = {
  id: '20260830_317_fendt_200_vario_current_us',
  description: 'Add the three current US Fendt 200 Vario models from the official Fendt US page',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='fendt' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Fendt' AND domain='fendt.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'Fendt 200 Vario','fendt-200-vario')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='fendt-200-vario' LIMIT 1`, [manufacturerId]);

    const externalId = 'fendt-200-vario-current-us-2026-08';
    const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
    if (!sourceRecordId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, URL, externalId, 'Fendt US 200 Vario current model overview', JSON.stringify({
          market: 'United States',
          captured: '2026-08-30',
          models,
          note: 'The current US page lists only 209, 210 and 211 Vario. European 207 and 208 models are intentionally excluded. The 211 Vario 124 hp value is explicitly DynamicPerformance power, not ordinary maximum power.',
        })],
      );
      sourceRecordId = Number(inserted.insertId);
    }

    const definitions: Array<[string, string, string, string, string | null, number]> = [
      ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 5],
      ['Engine', 'engine.dynamic_performance_power', 'Maximum power with DynamicPerformance', 'decimal', 'hp', 6],
    ];
    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const model of models) {
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Fendt 200 Vario compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Fendt 200 Vario',TRUE,?,'Current US model record. Only values explicitly published on the current Fendt US product page are included; 207 and 208 are not part of the US lineup shown by this source.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(c, machineId, versionId, definitionIds.get('engine.maximum_power')!, sourceRecordId, model.maxHp);
      if (model.dynamicPerformanceHp !== undefined) {
        await put(c, machineId, versionId, definitionIds.get('engine.dynamic_performance_power')!, sourceRecordId, model.dynamicPerformanceHp);
      }
    }
  },
};
