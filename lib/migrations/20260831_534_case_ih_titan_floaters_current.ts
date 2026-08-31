import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; url: string; hp: number; wheelLayout: string };

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/titan-series-floaters';
const models: Seed[] = [
  { slug: 'titan-3540', model: 'Titan 3540 Floater', url: `${FAMILY_URL}/titan-3540`, hp: 410, wheelLayout: '3-wheel chassis' },
  { slug: 'titan-4040', model: 'Titan 4040 Floater', url: `${FAMILY_URL}/titan-4040`, hp: 340, wheelLayout: '4-wheel chassis' },
  { slug: 'titan-4540', model: 'Titan 4540 Floater', url: `${FAMILY_URL}/titan-4540`, hp: 410, wheelLayout: '4-wheel chassis' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'floater.wheel_layout', 'Chassis wheel layout', 'text', null, 10],
  ['Engine', 'floater.engine_power', 'Engine power', 'decimal', 'hp', 10],
  ['Engine', 'floater.engine_displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Transmission', 'floater.transmission', 'Transmission', 'text', null, 10],
  ['Application System', 'floater.compatible_systems', 'Compatible application systems', 'text', null, 10],
  ['Precision Technology', 'floater.control_options', 'Published control options', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Titan floater migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function ensureRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, rawReference: unknown) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseIhTitanFloatersCurrentMigration: DbMigration = {
  id: '20260831_534_case_ih_titan_floaters_current',
  description: 'Add current Case IH US Titan 3540, 4040 and 4540 floaters',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Floater','floater') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='floater' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const familyRecordId = await ensureRecord(
      connection,
      sourceId,
      'case-ih-titan-floater-family-us-current-2026-08',
      FAMILY_URL,
      'Case IH Titan Series current US floater family specifications',
      {
        captured: '2026-08-31', market: 'United States', equipmentType: 'Floater',
        engineDisplacement: '8.7 L FPT diesel',
        compatibleSystems: '610 Liquid System or FA 1030 Air Boom Applicator depending chassis/configuration',
        controlOptions: 'Viper 4+ is published for FA 1030 Air Boom and 610 Liquid System configurations',
      },
    );

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Titan 40 Series Floaters','titan-40-series-floaters') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='titan-40-series-floaters' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Titan floater definition ${key}`);
      return value;
    };

    for (const model of models) {
      const recordId = await ensureRecord(
        connection,
        sourceId,
        `case-ih-${model.slug}-floater-us-current-2026-08`,
        model.url,
        `Case IH ${model.model} current US specifications`,
        { captured: '2026-08-31', market: 'United States', equipmentType: 'Floater', model: model.model, hp: model.hp, wheelLayout: model.wheelLayout, transmission: 'Allison 3000 RDS 6-speed automatic', familySource: FAMILY_URL },
      );
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States Titan floater chassis','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Titan 40 Series floater chassis',TRUE,?,'Current Case IH US model page with family-level application-system context captured 2026-08-31.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, recordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), recordId, 'Self-propelled floater chassis');
      await put(connection, machineId, versionId, def('configuration.market_scope'), recordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('floater.wheel_layout'), recordId, model.wheelLayout);
      await put(connection, machineId, versionId, def('floater.engine_power'), recordId, model.hp, 'hp');
      await put(connection, machineId, versionId, def('floater.transmission'), recordId, 'Allison 3000 RDS 6-speed automatic');
      await put(connection, machineId, versionId, def('floater.engine_displacement'), familyRecordId, 8.7, 'L');
      await put(connection, machineId, versionId, def('floater.compatible_systems'), familyRecordId, '610 Liquid System or FA 1030 Air Boom Applicator depending chassis/configuration');
      await put(connection, machineId, versionId, def('floater.control_options'), familyRecordId, 'Viper 4+ is published for FA 1030 Air Boom and 610 Liquid System configurations');
    }
  },
};
