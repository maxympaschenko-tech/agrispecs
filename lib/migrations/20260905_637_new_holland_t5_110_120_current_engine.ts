import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const ELECTRO_URL = 'https://assets.cnhindustrial.com/nhag/nar/en-us/assets/pdf/agricultural-tractors/t5-electro-command-tier-4b-brochure-us-en.PDF';
const DUAL_URL = 'https://assets.cnhindustrial.com/nhag/nar/en-us/assets/pdf/agricultural-tractors/t5-dual-command-tier-4b-brochure-us-en.PDF';
const SOURCE_EXTERNAL_ID = 'new-holland-t5-110-120-current-us-shared-engine-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing current T5.110/T5.120 engine-spec dependency.');
  return Number(rows[0].id);
}

async function upsertSpec(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  specKey: string,
  value: string | number,
  unit: string | null,
  sourceRecordId: number,
) {
  const definitionId = await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [specKey]);
  await connection.query(
    `INSERT INTO machine_specs (
      machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence
    ) VALUES (?,?,?,?,?,?,?,'official')
    ON DUPLICATE KEY UPDATE
      value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
      source_record_id=VALUES(source_record_id),confidence='official'`,
    [
      machineId,
      versionId,
      definitionId,
      typeof value === 'string' ? value : null,
      typeof value === 'number' ? value : null,
      unit,
      sourceRecordId,
    ],
  );
}

export const newHollandT5110120CurrentEngineMigration: DbMigration = {
  id: '20260905_637_new_holland_t5_110_120_current_engine',
  description: 'Add engine specifications shared by current US T5.110/T5.120 Dual Command and Electro Command configurations from official New Holland brochures',
  async apply(connection) {
    await connection.query(
      `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
       VALUES ('Engine','engine.model','Engine model','text',NULL,2)
       ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    );
    await connection.query(
      `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
       VALUES ('Engine','engine.displacement','Engine displacement','decimal','L',20)
       ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    );
    await connection.query(
      `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
       VALUES ('Engine','engine.emissions','Emissions system','text',NULL,50)
       ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE domain='assets.cnhindustrial.com' AND source_type='manufacturer' ORDER BY CASE WHEN authority_level='official' THEN 0 ELSE 1 END,id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland / CNH Industrial','assets.cnhindustrial.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [recordRows] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [
          sourceId,
          ELECTRO_URL,
          SOURCE_EXTERNAL_ID,
          'New Holland North America T5.110/T5.120 shared Dual Command and Electro Command engine specifications',
          JSON.stringify({
            role: 'Official shared engine identity for the current T5.110/T5.120 transmission families',
            models: ['T5.110', 'T5.120'],
            primaryDocument: {
              url: ELECTRO_URL,
              title: 'T5 Electro Command Tier 4B brochure - US/Canada',
              evidence: 'Technical specification table lists FPT F5G, 4 cylinders, 207 cu in (3.4 L), and ECOBlue Compact HI-eSCR with light CEGR for T5.110 and T5.120.',
            },
            corroboratingDocument: {
              url: DUAL_URL,
              title: 'T5 Dual Command Tier 4B brochure - US/Canada',
              evidence: 'Technical specification table independently lists FPT F5G, 4-cylinder diesel, 207 cu in (3.4 L), and ECOBlue Compact HI-eSCR with light CEGR for T5.110 and T5.120 Dual Command.',
            },
            applicability: 'Only fields proven identical across both current T5.110/T5.120 Dual Command and Electro Command configurations are stored on the shared 2026 US machine version.',
            excludedConfigurationSpecificValues: [
              'hydraulic pump flows',
              '3-point hitch lift capacity',
              'overall length and wheelbase',
              'cab/ROPS dimensions',
              'transmission-specific options',
            ],
            confidence: 'official',
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      await upsertSpec(connection, machineId, versionId, 'engine.model', 'FPT F5G', null, sourceRecordId);
      await upsertSpec(connection, machineId, versionId, 'engine.displacement', 3.4, 'L', sourceRecordId);
      await upsertSpec(
        connection,
        machineId,
        versionId,
        'engine.emissions',
        'ECOBlue Compact HI-eSCR selective catalytic reduction with light CEGR',
        null,
        sourceRecordId,
      );
    }
  },
};
