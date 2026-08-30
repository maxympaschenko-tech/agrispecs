import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  series: 'YT2' | 'YM3';
  station: 'ROPS' | 'Cab';
  grossHp: number;
  ratedRpm?: number;
  transmission: string;
  driveline?: string;
  ptoPowerHp: number;
  rearPto: string;
  midPto?: string;
  hitchCategory: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  wheelbaseIn: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const YT2_LINEUP_URL = 'https://www.yanmartractor.com/products/tractors/yt2-series/';
const YM3_LINEUP_URL = 'https://www.yanmartractor.com/products/tractors/ym3-series/';

const models: Seed[] = [
  {
    slug: 'yt235', name: 'YT235', url: 'https://www.yanmartractor.com/products/tractors/yt2-series/yt235/', series: 'YT2', station: 'ROPS',
    grossHp: 34.2, transmission: 'Hydrostatic (Dual Touch Pedal), 3 speed ranges', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 27, rearPto: '540 rpm', midPto: '2,013 rpm', hitchCategory: 'Category 1',
    lengthIn: 116.9, widthIn: 58.3, heightIn: 89.0, wheelbaseIn: 65,
  },
  {
    slug: 'yt235c', name: 'YT235C', url: 'https://www.yanmartractor.com/products/tractors/yt2-series/yt235c/', series: 'YT2', station: 'Cab',
    grossHp: 34.2, transmission: 'Hydrostatic (Dual Touch Pedal), 3 speed ranges', driveline: '2WD/4WD selectable engagement',
    ptoPowerHp: 27, rearPto: '540 rpm', midPto: '2,013 rpm', hitchCategory: 'Category 1',
    lengthIn: 116.9, widthIn: 58.3, heightIn: 83.6, wheelbaseIn: 65,
  },
  {
    slug: 'ym342', name: 'YM342', url: 'https://www.yanmartractor.com/products/tractors/ym3-series/ym342/', series: 'YM3', station: 'ROPS',
    grossHp: 41.4, transmission: 'Synchronized shuttle shift, 8F / 8R',
    ptoPowerHp: 31.0, rearPto: '540 / 540E', hitchCategory: 'Category 1 & 2',
    lengthIn: 133.6, widthIn: 70.9, heightIn: 98.0, wheelbaseIn: 74.8,
    note: 'The current page marketing prose rounds engine power to 41 hp; the model-specific Featured Specs table publishes 41.4 HP, which is retained.',
  },
  {
    slug: 'ym347', name: 'YM347', url: 'https://www.yanmartractor.com/products/tractors/ym3-series/ym347/', series: 'YM3', station: 'ROPS',
    grossHp: 46.0, transmission: 'Synchronized shuttle shift',
    ptoPowerHp: 35.5, rearPto: '540 / 540E', hitchCategory: 'Category 1 & 2',
    lengthIn: 133.6, widthIn: 70.9, heightIn: 98.0, wheelbaseIn: 74.8,
    note: 'Current Yanmar America Featured Specs publish 46 HP and 35.5 PTO HP. Older or other indexed values are not substituted for the current model-page values.',
  },
  {
    slug: 'ym359', name: 'YM359', url: 'https://www.yanmartractor.com/products/tractors/ym3-series/ym359/', series: 'YM3', station: 'ROPS',
    grossHp: 58.9, ratedRpm: 2500, transmission: 'Synchronized reverser/main shift, 2 range; 8F / 8R',
    ptoPowerHp: 47.0, rearPto: '540 @ 2,430 engine rpm / 540E @ 1,764 engine rpm', hitchCategory: 'Category 1 & 2',
    lengthIn: 133.9, widthIn: 70.9, heightIn: 98.0, wheelbaseIn: 77.5,
    note: 'The current YM359 page explicitly states 47 PTO horsepower in the model description while its Featured Specs PTO-power cell is blank. The explicit model-page prose value is retained and the internal omission is recorded rather than replaced from another market or model.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Yanmar YT2/YM3 migration dependency missing');
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

export const yanmarYt2Ym3CurrentUsMigration: DbMigration = {
  id: '20260830_352_yanmar_yt2_ym3_current_us',
  description: 'Add five current US Yanmar YT2 and YM3 compact tractors from official Yanmar America model-specific pages',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='yanmar' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Yanmar' AND domain='yanmartractor.com' LIMIT 1`);

    const seriesDefs = [
      { slug: 'yanmar-yt2', name: 'Yanmar YT2 Series', series: 'YT2' as const, url: YT2_LINEUP_URL },
      { slug: 'yanmar-ym3', name: 'Yanmar YM3 Series', series: 'YM3' as const, url: YM3_LINEUP_URL },
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
      const seriesSlug = model.series === 'YT2' ? 'yanmar-yt2' : 'yanmar-ym3';
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, seriesSlug]);
      const sourceRecordId = await ensureSource(c, sourceId, `yanmar-${model.slug}-current-us-2026-08`, model.url, `Yanmar America ${model.name} current specifications`, {
        market: 'United States', captured: '2026-08-30', model,
        sourcePolicy: 'Current Yanmar America model-specific Featured Specs and model prose are used. Empty or internally inconsistent cells are not backfilled from other models or markets.',
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
        [machineId, VERSION, `${model.station}; ${model.transmission}`, sourceRecordId, model.note || 'Current Yanmar America model-specific specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station', model.station, null],
        ['engine.make', 'Yanmar', null],
        ['engine.gross_power', model.grossHp, 'hp'],
        ['engine.rated_speed', model.ratedRpm, 'rpm'],
        ['transmission.standard', model.transmission, null],
        ['drivetrain.type', model.driveline, null],
        ['pto.rated_power', model.ptoPowerHp, 'hp'],
        ['pto.rear_description', model.rearPto, null],
        ['pto.mid_description', model.midPto, null],
        ['hitch.category', model.hitchCategory, null],
        ['dimensions.overall_length', model.lengthIn, 'in'],
        ['dimensions.overall_width', model.widthIn, 'in'],
        ['dimensions.overall_height', model.heightIn, 'in'],
        ['dimensions.wheelbase', model.wheelbaseIn, 'in'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Yanmar YT2/YM3 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
