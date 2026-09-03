import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Model = { slug: string; model: string; grossHp: number; ptoHp: number };

const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/powerstar-tractors';
const SOURCE_EXTERNAL_ID = 'new-holland-powerstar-next-generation-us-2026-09';
const VERSION_SLUG = 'united-states-current-2026-09-next-generation';

const models: Model[] = [
  { slug: 'powerstar-75', model: 'PowerStar 75', grossHp: 74, ptoHp: 65 },
  { slug: 'powerstar-90', model: 'PowerStar 90', grossHp: 86, ptoHp: 73 },
  { slug: 'powerstar-100', model: 'PowerStar 100', grossHp: 99, ptoHp: 85 },
  { slug: 'powerstar-110', model: 'PowerStar 110', grossHp: 107, ptoHp: 93 },
  { slug: 'powerstar-120', model: 'PowerStar 120', grossHp: 117, ptoHp: 100 },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar next-generation migration dependency.');
  return Number(rows[0].id);
}

export const newHollandPowerStarCurrentTransitionMigration: DbMigration = {
  id: '20260903_597_new_holland_powerstar_current_transition',
  description: 'Create a new current US PowerStar version for the officially presented next-generation F36 platform while retaining the August F5C snapshot as historical',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland','agriculture.newholland.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [sourceRecordRows] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = sourceRecordRows[0]?.id ? Number(sourceRecordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'New Holland US PowerStar next-generation current product page',
          JSON.stringify({
            captured: '2026-09-03',
            currentProductCopy: {
              generation: 'The next generation of powerful utility',
              engine: '3.6-liter FPT F36 four-cylinder',
              transmissionOptions: ['12x12 Power Shuttle', 'Dual Command', '16x16 Electro Command'],
              platform: 'Cab or ROPS utility tractor',
            },
            modelCards: models.map((model) => ({ model: model.model, grossHp: model.grossHp, ptoHp: model.ptoHp })),
            sourceConflictGuardrail: 'The same official web experience still exposes a legacy technical-specification table with F5C 3.4 L values. This migration intentionally records only next-generation feature copy and model-card facts that are explicit on the current product page; the August 2026 F5C version remains historical rather than being overwritten.',
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    const specDefs: Array<[string, string, string, string, string | null, number]> = [
      ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
      ['Machine Configuration', 'configuration.drive', 'Drive configuration', 'text', null, 2],
      ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
      ['Engine', 'engine.model', 'Engine model', 'text', null, 2],
      ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 4],
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
      ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 10],
      ['Transmission', 'transmission.standard', 'Transmission options', 'text', null, 10],
      ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
    ];
    for (const def of specDefs) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        def,
      );
    }

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,
        [manufacturerId, model.slug],
      );

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=?`, [machineId]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States','Next-generation PowerStar utility tractor; cab or ROPS platform',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [
          machineId,
          VERSION_SLUG,
          sourceRecordId,
          'Official New Holland US current PowerStar page captured September 2026 now presents the next-generation 3.6 L FPT F36 platform. Only facts explicit in current feature copy/model cards are asserted because the same site still exposes a legacy F5C technical table.',
        ],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab or ROPS', null],
        ['configuration.drive', '2WD or 4WD', null],
        ['engine.make', 'FPT', null],
        ['engine.model', 'F36', null],
        ['engine.cylinders', 4, null],
        ['engine.displacement', 3.6, 'L'],
        ['engine.gross_power', model.grossHp, 'hp'],
        ['transmission.standard', '12x12 Power Shuttle or Dual Command; 16x16 Electro Command available by configuration', null],
        ['pto.rated_power', model.ptoHp, 'hp'],
      ];

      for (const [specKey, value, unit] of values) {
        const specDefinitionId = await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [specKey]);
        await connection.query(
          `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
           VALUES (?,?,?,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, versionId, specDefinitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
        );
      }
    }
  },
};
