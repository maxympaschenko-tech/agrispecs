import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  series: 'YT3' | 'SM';
  station?: 'ROPS' | 'Cab';
  grossHp: number;
  transmission: string;
  driveline: string;
  ptoPowerHp: number;
  rearPto: string;
  hitchCategory: string;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  wheelbaseIn?: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const YT3_LINEUP_URL = 'https://www.yanmartractor.com/products/tractors/yt3-series/';
const SM_LINEUP_URL = 'https://www.yanmartractor.com/products/tractors/sm-series/';

const models: Seed[] = [
  {
    slug: 'yt347', name: 'YT347', url: 'https://www.yanmartractor.com/products/tractors/yt3-series/yt347/', series: 'YT3', station: 'ROPS',
    grossHp: 46.0, transmission: 'I-HMT (Integrated Hydro Mechanical Transmission)', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 39.5, rearPto: '540 rpm', hitchCategory: 'Category 1',
    lengthIn: 130.9, widthIn: 70.6, heightIn: 95.7, wheelbaseIn: 75.9,
    note: 'The current model prose mentions Category 1 & 2 capability while the model-specific Featured Specs table publishes Category 1. The detailed table value is retained for the current structured record.',
  },
  {
    slug: 'yt347c', name: 'YT347C', url: 'https://www.yanmartractor.com/products/tractors/yt3-series/yt347c/', series: 'YT3', station: 'Cab',
    grossHp: 46.0, transmission: 'I-HMT (Integrated Hydro Mechanical Transmission)', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 39.5, rearPto: '540 rpm', hitchCategory: 'Category 1',
    lengthIn: 130.9, widthIn: 70.6, heightIn: 95.7, wheelbaseIn: 75.9,
    note: 'The current model prose mentions Category 1 & 2 capability while the model-specific Featured Specs table publishes Category 1. The detailed table value is retained.',
  },
  {
    slug: 'yt359', name: 'YT359', url: 'https://www.yanmartractor.com/products/tractors/yt3-series/yt359/', series: 'YT3', station: 'ROPS',
    grossHp: 58.9, transmission: 'I-HMT (Integrated Hydro Mechanical Transmission)', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 52.0, rearPto: '540 rpm', hitchCategory: 'Category 1',
    lengthIn: 132.1, widthIn: 70.6, heightIn: 95.7, wheelbaseIn: 77.4,
  },
  {
    slug: 'yt359c', name: 'YT359C', url: 'https://www.yanmartractor.com/products/tractors/yt3-series/yt359c/', series: 'YT3', station: 'Cab',
    grossHp: 58.9, transmission: 'I-HMT (Integrated Hydro Mechanical Transmission)', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 52.0, rearPto: '540 rpm', hitchCategory: 'Category 1',
    lengthIn: 132.1, widthIn: 70.6, heightIn: 89.5, wheelbaseIn: 77.4,
    note: 'The current YT359C prose says Category 1 & 2 while its Featured Specs table publishes Category 1. The model-specific table is used and the discrepancy is preserved in provenance.',
  },
  {
    slug: 'sm240', name: 'SM240', url: 'https://www.yanmartractor.com/products/tractors/sm-series/sm240/', series: 'SM', station: 'ROPS',
    grossHp: 36.9, transmission: 'Synchro Shuttle', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 28.2, rearPto: '540 rpm', hitchCategory: 'Category 1',
    note: 'Current Yanmar America Featured Specs publish 28.2 PTO HP. Older indexed values are not substituted.',
  },
  {
    slug: 'sm240h', name: 'SM240H', url: 'https://www.yanmartractor.com/products/tractors/sm-series/sm240h/', series: 'SM',
    grossHp: 36.9, transmission: 'Hydrostatic', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 27.5, rearPto: '540 rpm', hitchCategory: 'Category 1',
    note: 'Current Yanmar America Featured Specs publish 27.5 PTO HP; no operator-station label or dimensions are inferred from product imagery.',
  },
  {
    slug: 'sm475', name: 'SM475', url: 'https://www.yanmartractor.com/products/tractors/sm-series/sm475/', series: 'SM', station: 'Cab',
    grossHp: 74.0, transmission: 'Power Shuttle', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 64.1, rearPto: '540 rpm', hitchCategory: 'Category 2',
    note: 'Current Yanmar America Featured Specs publish 64.1 PTO HP. Earlier indexed values are not used to overwrite the current model page.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Yanmar YT3/SM migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const yanmarYt3SmCurrentUsMigration: DbMigration = {
  id: '20260830_353_yanmar_yt3_sm_current_us',
  description: 'Add seven current US Yanmar YT3 and SM tractors from official current model-specific pages',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='yanmar' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Yanmar' AND domain='yanmartractor.com' LIMIT 1`);

    const seriesDefs = [
      { slug: 'yanmar-yt3', name: 'Yanmar YT3 Series', series: 'YT3' as const, url: YT3_LINEUP_URL },
      { slug: 'yanmar-sm', name: 'Yanmar SM Series', series: 'SM' as const, url: SM_LINEUP_URL },
    ];
    for (const series of seriesDefs) {
      await c.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series.name, series.slug],
      );
      await ensureSource(c, sourceId, `${series.slug}-current-us-lineup-2026-08`, series.url, `${series.name} current US lineup`, {
        market: 'United States', captured: '2026-08-30', models: models.filter((model) => model.series === series.series).map((model) => model.name),
      });
    }

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const model of models) {
      const seriesSlug = model.series === 'YT3' ? 'yanmar-yt3' : 'yanmar-sm';
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, seriesSlug]);
      const sourceRecordId = await ensureSource(c, sourceId, `yanmar-${model.slug}-current-us-2026-08`, model.url, `Yanmar America ${model.name} current specifications`, {
        market: 'United States', captured: '2026-08-30', model,
        sourcePolicy: 'Current model-specific Yanmar America Featured Specs are used. Where marketing prose conflicts with the Featured Specs table, the detailed table is retained and the discrepancy is recorded.',
        note: model.note || null,
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Yanmar tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${model.station ? `${model.station}; ` : ''}${model.transmission}`, sourceRecordId, model.note || 'Current Yanmar America model-specific specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station', model.station, null],
        ['engine.make', 'Yanmar', null],
        ['engine.gross_power', model.grossHp, 'hp'],
        ['transmission.standard', model.transmission, null],
        ['drivetrain.type', model.driveline, null],
        ['pto.rated_power', model.ptoPowerHp, 'hp'],
        ['pto.rear_description', model.rearPto, null],
        ['hitch.category', model.hitchCategory, null],
        ['dimensions.overall_length', model.lengthIn, 'in'],
        ['dimensions.overall_width', model.widthIn, 'in'],
        ['dimensions.overall_height', model.heightIn, 'in'],
        ['dimensions.wheelbase', model.wheelbaseIn, 'in'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Yanmar YT3/SM spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
