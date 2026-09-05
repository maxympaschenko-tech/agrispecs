import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const OFFICIAL_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t5-series';
const OFFICIAL_EXTERNAL_ID = 'new-holland-t5-current-us-transmission-lineup-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

const historicalVersions = [
  {
    slug: 'us-autocommand-stage-v-historical',
    marketCode: 'US',
    marketName: 'United States',
    modelYearStart: 2019,
    configuration: 'AutoCommand Stage V — historical US fitment context',
    prefix: 'AutoCommand%',
    note: 'Exact parts catalogs establish AutoCommand Stage V fitment beginning in 2019, including MY23 records. New Holland North America no longer lists Auto Command as a current T5.110/T5.120 transmission in September 2026. The exact final model year is not asserted.',
  },
  {
    slug: 'nafta-dynamic-command-stage-v-historical',
    marketCode: 'NAFTA',
    marketName: 'North America / NAFTA',
    modelYearStart: 2020,
    configuration: 'Dynamic Command Stage V — historical NAFTA fitment context',
    prefix: 'Dynamic Command%',
    note: 'Exact parts catalogs establish Dynamic Command Stage V NAFTA fitment beginning in 2020. New Holland North America no longer lists Dynamic Command as a current T5.110/T5.120 transmission in September 2026. The exact final model year is not asserted.',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.110/T5.120 historical-fitment context dependency.');
  return Number(rows[0].id);
}

export const newHollandT5110120HistoricalFitmentContextMigration: DbMigration = {
  id: '20260905_635_new_holland_t5_110_120_historical_fitment_context',
  description: 'Move T5.110/T5.120 AutoCommand and Dynamic Command Stage V parts out of the current 2026 US version into historical configuration contexts',
  async apply(connection) {
    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE domain='agriculture.newholland.com' AND source_type='manufacturer' ORDER BY CASE WHEN authority_level='official' THEN 0 ELSE 1 END,id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Agriculture','agriculture.newholland.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingRecord] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [OFFICIAL_EXTERNAL_ID],
    );
    let sourceRecordId = existingRecord[0]?.id ? Number(existingRecord[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [
          sourceId,
          OFFICIAL_URL,
          OFFICIAL_EXTERNAL_ID,
          'New Holland North America current T5 Series transmission lineup - September 2026',
          JSON.stringify({
            role: 'Current-vs-historical configuration boundary evidence',
            captured: '2026-09',
            currentNorthAmericaLineup: {
              'T5.110': 'Dual Command or Electro Command; current transmission feature section assigns Electro Command to T5.110/T5.120',
              'T5.120': 'Dual Command or Electro Command; current transmission feature section assigns Electro Command to T5.110/T5.120',
              'T5.130': 'Dynamic Command or Auto Command',
              'T5.140': 'Dynamic Command or Auto Command',
            },
            correctionPurpose: 'Prevent historical T5.110/T5.120 AutoCommand/Dynamic Command Stage V part records from being rendered as if they belong to the current 2026 US specification version.',
            guardrail: 'This source proves that AutoCommand/Dynamic Command are not current 2026 T5.110/T5.120 offerings. It does not prove an exact discontinuation year; historical version end years remain NULL.',
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
      const currentVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      for (const historical of historicalVersions) {
        await connection.query(
          `INSERT INTO machine_versions (
            machine_id,slug,market_code,market_name,model_year_start,model_year_end,configuration,is_current,source_record_id,notes
          ) VALUES (?,?,?,?,?,NULL,?,FALSE,?,?)
          ON DUPLICATE KEY UPDATE
            market_code=VALUES(market_code),market_name=VALUES(market_name),model_year_start=VALUES(model_year_start),
            model_year_end=NULL,configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
          [
            machineId,
            historical.slug,
            historical.marketCode,
            historical.marketName,
            historical.modelYearStart,
            historical.configuration,
            sourceRecordId,
            historical.note,
          ],
        );
        const historicalVersionId = await selectId(
          connection,
          `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
          [machineId, historical.slug],
        );

        await connection.query(
          `UPDATE machine_parts
           SET machine_version_id=?
           WHERE machine_id=?
             AND configuration_note LIKE ?
             AND (machine_version_id=? OR machine_version_id IS NULL)`,
          [historicalVersionId, machineId, historical.prefix, currentVersionId],
        );
      }
    }
  },
};
