import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Family = 'DM1000' | 'DM2000' | 'DM3000' | 'DM4000' | 'DM5000';
type Seed = {
  slug: string;
  model: string;
  family: Family;
  cuttingWidth: string;
  weightLb: number;
  transportWidth: string;
  hitch: string;
  drawbarHitch: string;
  ptoRpm: string;
  minimumPtoHp: number;
  discsBlades: string;
  remotes: number;
  cutterbarRange: string;
  stubbleHeight: string;
  detailSource: 'dm1000' | 'dm2000' | 'dm3000-4000' | 'dm5000';
  notes: string;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/disc-mowers';
const CURRENT_DM_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/dm.pdf?sfvrsn=12735dd3_5';
const FULL_LINE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/2026-full-product-line-brochure.pdf?sfvrsn=efd39503_10';
const DM1000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/dm1000_specs.pdf?sfvrsn=ad86b444_2';
const DM2000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/dm2000_specs.pdf?sfvrsn=b93d24cf_2';
const DM3000_4000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/dm3000_dm4000_specs.pdf?sfvrsn=63a78842_2';
const DM5000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/dm5000_specs.pdf?sfvrsn=f440ab6c_2';

const models: Seed[] = [
  {
    slug: 'dm1017', model: 'DM1017', family: 'DM1000', cuttingWidth: `5'6"`, weightLb: 915, transportWidth: `3'9"`, hitch: 'Category I', drawbarHitch: 'Not applicable', ptoRpm: '540', minimumPtoHp: 36, discsBlades: '4 / 12', remotes: 1, cutterbarRange: '-45° / +45°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm1000',
    notes: 'Current Kubota USA live lineup requires 36 hp. The newer current DM brochure publishes 915 lb while the dedicated DM1000 spec sheet publishes 860 lb; this version uses the newer brochure weight and keeps the narrower spec sheet for operating details. The 2026 full-line catalog identifies the DM1017 hitch as Category I, while the dedicated DM1000 sheet parses the family hitch differently; Category I is retained from the current catalog.',
  },
  {
    slug: 'dm1022', model: 'DM1022', family: 'DM1000', cuttingWidth: `7'2"`, weightLb: 1058, transportWidth: `3'9"`, hitch: 'Category II', drawbarHitch: 'Not applicable', ptoRpm: '540', minimumPtoHp: 42, discsBlades: '6 / 18', remotes: 1, cutterbarRange: '-45° / +45°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm1000',
    notes: 'Current live Kubota USA lineup requires 42 hp. Newer current DM brochure weight 1,058 lb is retained instead of the older dedicated-sheet 948 lb value; operating details remain tied to the DM1000 specification sheet.',
  },
  {
    slug: 'dm1024', model: 'DM1024', family: 'DM1000', cuttingWidth: `7'9"`, weightLb: 1091, transportWidth: `3'9"`, hitch: 'Category II', drawbarHitch: 'Not applicable', ptoRpm: '540', minimumPtoHp: 46, discsBlades: '6 / 18', remotes: 1, cutterbarRange: '-45° / +45°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm1000',
    notes: 'Current live Kubota USA lineup requires 46 hp. The current DM brochure and dedicated DM1000 sheet publish 7 ft 9 in cutting width, while the 2026 full-line catalog prints 7 ft 10 in; this version keeps the matching current product-brochure/spec-sheet value. Newer brochure weight 1,091 lb replaces the older dedicated-sheet 992 lb figure.',
  },
  {
    slug: 'dm2028', model: 'DM2028', family: 'DM2000', cuttingWidth: `9'2"`, weightLb: 1426, transportWidth: `4'7"`, hitch: 'Category II', drawbarHitch: 'Not applicable', ptoRpm: '540', minimumPtoHp: 50, discsBlades: '8 / 24', remotes: 1, cutterbarRange: '-35° / +35°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm2000',
    notes: 'Current live Kubota USA lineup requires 50 hp. The newer current DM brochure publishes 1,426 lb while the dedicated DM2000 spec sheet publishes 1,345 lb; newer brochure weight is retained and operating details remain sourced to the dedicated sheet.',
  },
  {
    slug: 'dm2032', model: 'DM2032', family: 'DM2000', cuttingWidth: `10'5"`, weightLb: 1508, transportWidth: `4'7"`, hitch: 'Category II', drawbarHitch: 'Not applicable', ptoRpm: '540', minimumPtoHp: 55, discsBlades: '8 / 24', remotes: 1, cutterbarRange: '-35° / +35°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm2000',
    notes: 'Current live Kubota USA lineup requires 55 hp. The newer current DM brochure publishes 10 ft 5 in and 1,508 lb; the dedicated DM2000 sheet and 2026 full-line catalog publish 10 ft 6 in and approximately 1,510 lb. This version keeps the newer product-brochure values and records the discrepancy rather than averaging it.',
  },
  {
    slug: 'dm3087', model: 'DM3087', family: 'DM3000', cuttingWidth: `28'7"`, weightLb: 3000, transportWidth: `9'7"`, hitch: 'Category II / III', drawbarHitch: 'Not applicable', ptoRpm: '1000', minimumPtoHp: 140, discsBlades: '16 / 48', remotes: 2, cutterbarRange: '-35° / +35°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm3000-4000',
    notes: 'Current Kubota USA live page and current DM product brochure identify the DM3087 as a 140 hp requirement with 28 ft 7 in working width and approximately 3,000 lb weight. The 2026 full-line catalog instead publishes a 120 hp minimum and 3,420 lb. This version intentionally follows the current live/product-brochure value set and preserves the catalog conflict in notes. The current live page also describes three-bladed discs, supporting 16 discs / 48 blades despite a narrower spec-sheet parse that can appear as 16 / 24.',
  },
  {
    slug: 'dm4032', model: 'DM4032', family: 'DM4000', cuttingWidth: `10'6"`, weightLb: 1566, transportWidth: `9'10"`, hitch: 'Category II', drawbarHitch: 'Not applicable', ptoRpm: '1000 (750 Eco Speed by pulley change)', minimumPtoHp: 40, discsBlades: '8 / 24', remotes: 1, cutterbarRange: '-17° / +17°', stubbleHeight: '0.78–1.97 in', detailSource: 'dm3000-4000',
    notes: 'Current Kubota USA lineup requires 40 hp. Current DM4032 specification material publishes 10 ft 6 in, 1,566 lb, Category II hitch and 8 discs / 24 blades. Kubota live product copy states the two-speed driveline can reduce 1,000 rpm to 750 rpm Eco Speed. The 2026 full-line catalog notes that an A Frame Mounting Kit is required for DM4032.',
  },
  {
    slug: 'dm5028', model: 'DM5028', family: 'DM5000', cuttingWidth: `9'2"`, weightLb: 2734, transportWidth: `8'6"`, hitch: 'Category II', drawbarHitch: 'Standard pin hitch', ptoRpm: '540 / 1000', minimumPtoHp: 45, discsBlades: '8 / 24', remotes: 2, cutterbarRange: '-17° / +17°', stubbleHeight: '1.79–3.94 in', detailSource: 'dm5000',
    notes: 'Current Kubota USA live lineup requires 45 hp. Values use the recent DM5000 specification sheet; its 1.79–3.94 in stubble-height range is retained instead of the different 1.25–3.25 in range printed in the 2026 full-line table.',
  },
  {
    slug: 'dm5032', model: 'DM5032', family: 'DM5000', cuttingWidth: `10'6"`, weightLb: 2756, transportWidth: `9'10"`, hitch: 'Category II', drawbarHitch: 'Standard pin hitch', ptoRpm: '540 / 1000', minimumPtoHp: 65, discsBlades: '8 / 24', remotes: 2, cutterbarRange: '-17° / +17°', stubbleHeight: '1.79–3.94 in', detailSource: 'dm5000',
    notes: 'Current Kubota USA live lineup requires 65 hp. Values use the recent DM5000 specification sheet; its 2,756 lb weight and 1.79–3.94 in stubble-height range remain attached to this current source version.',
  },
  {
    slug: 'dm5040', model: 'DM5040', family: 'DM5000', cuttingWidth: `13'1"`, weightLb: 2778, transportWidth: `12'5"`, hitch: 'Category II', drawbarHitch: 'Standard pin hitch', ptoRpm: '540 / 1000', minimumPtoHp: 85, discsBlades: '10 / 30', remotes: 2, cutterbarRange: '-17° / +17°', stubbleHeight: '1.79–3.94 in', detailSource: 'dm5000',
    notes: 'Current Kubota USA live lineup requires 85 hp. Values use the recent DM5000 specification sheet; its 2,778 lb weight and 1.79–3.94 in stubble-height range remain attached to this current source version.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'kubota.disc_mower.series', 'Kubota disc mower series', 'text', null, 3],
  ['Mower Performance', 'kubota.disc_mower.cutting_width', 'Cutting width', 'text', null, 10],
  ['Dimensions & Weight', 'kubota.disc_mower.approx_weight', 'Approximate weight', 'decimal', 'lb', 10],
  ['Dimensions & Weight', 'kubota.disc_mower.transport_width', 'Transport width', 'text', null, 20],
  ['Attachment to Tractor', 'kubota.disc_mower.hitch_category', 'Hitch category', 'text', null, 10],
  ['Attachment to Tractor', 'kubota.disc_mower.drawbar_hitch', 'Drawbar / pin hitch', 'text', null, 20],
  ['Attachment to Tractor', 'kubota.disc_mower.pto_speed', 'PTO speed', 'text', null, 30],
  ['Attachment to Tractor', 'kubota.disc_mower.minimum_pto_hp', 'Minimum PTO horsepower required', 'decimal', 'hp', 40],
  ['Mower Operation', 'kubota.disc_mower.discs_blades', 'Number of discs / blades', 'text', null, 10],
  ['Mower Operation', 'kubota.disc_mower.remotes', 'Hydraulic remotes required', 'integer', null, 20],
  ['Mower Operation', 'kubota.disc_mower.cutterbar_range', 'Cutterbar operating range', 'text', null, 30],
  ['Mower Operation', 'kubota.disc_mower.stubble_height', 'Stubble height', 'text', null, 40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, p);
  if (!rows[0]) throw new Error('Kubota disc mower migration dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sourceId: number, url: string, externalId: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(result.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, recordId: number, value: string | number, unit: string | null = null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, recordId],
  );
}

export const kubotaCurrentDiscMowersMigration: DbMigration = {
  id: '20260901_572_kubota_current_disc_mowers',
  description: 'Add current Kubota USA DM Series disc mowers with source-specific current specifications and conflict notes',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Disc Mower','disc-mower') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='disc-mower' LIMIT 1`);
    const sourceId = await source(c);

    const liveRecord = await record(c, sourceId, LIVE_URL, 'kubota-disc-mowers-live-current-2026-09', 'Kubota USA current Disc Mowers lineup', { captured: '2026-09-01', market: 'United States', currentModels: models.map((m) => ({ model: m.model, minimumPtoHp: m.minimumPtoHp })) });
    const currentDmRecord = await record(c, sourceId, CURRENT_DM_URL, 'kubota-disc-mowers-current-product-brochure-2026-09', 'Kubota current Disc Mowers product brochure', { captured: '2026-09-01', use: 'current dimensions and weights where newer than family sheets' });
    const fullLineRecord = await record(c, sourceId, FULL_LINE_URL, 'kubota-2026-full-line-disc-mowers', 'Kubota USA 2026 Full Product Line - Disc Mowers', { captured: '2026-09-01', page: 45, use: 'transport widths, catalog classifications and discrepancy tracking' });
    const detailRecords = {
      dm1000: await record(c, sourceId, DM1000_URL, 'kubota-dm1000-specs-current-2026', 'Kubota DM1000 current specification sheet', { captured: '2026-09-01', models: ['DM1017', 'DM1022', 'DM1024'] }),
      dm2000: await record(c, sourceId, DM2000_URL, 'kubota-dm2000-specs-current-2026', 'Kubota DM2000 current specification sheet', { captured: '2026-09-01', models: ['DM2028', 'DM2032'] }),
      'dm3000-4000': await record(c, sourceId, DM3000_4000_URL, 'kubota-dm3000-dm4000-specs-current-2026', 'Kubota DM3000 and DM4000 current specification sheet', { captured: '2026-09-01', models: ['DM3087', 'DM4032'] }),
      dm5000: await record(c, sourceId, DM5000_URL, 'kubota-dm5000-specs-current-2026', 'Kubota DM5000 current specification sheet', { captured: '2026-09-01', models: ['DM5028', 'DM5032', 'DM5040'] }),
    } as const;

    const seriesIds = new Map<Family, number>();
    for (const family of ['DM1000', 'DM2000', 'DM3000', 'DM4000', 'DM5000'] as Family[]) {
      const seriesSlug = `kubota-${family.toLowerCase()}`;
      await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, `Kubota ${family} Series`, seriesSlug]);
      seriesIds.set(family, await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, seriesSlug]));
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Kubota disc mower definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = seriesIds.get(model.family);
      if (!seriesId) throw new Error(`Missing Kubota disc mower series ${model.family}`);
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Kubota USA Disc Mower from manufacturer live lineup and current specification material','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Kubota USA disc mower',TRUE,?,?)
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,
        [machineId, VERSION, liveRecord, model.notes],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const detailRecord = detailRecords[model.detailSource];

      await put(c, machineId, versionId, def('configuration.type'), liveRecord, 'Disc mower');
      await put(c, machineId, versionId, def('configuration.market_scope'), liveRecord, 'United States current lineup');
      await put(c, machineId, versionId, def('kubota.disc_mower.series'), liveRecord, model.family);
      await put(c, machineId, versionId, def('kubota.disc_mower.cutting_width'), currentDmRecord, model.cuttingWidth);
      await put(c, machineId, versionId, def('kubota.disc_mower.approx_weight'), currentDmRecord, model.weightLb, 'lb');
      await put(c, machineId, versionId, def('kubota.disc_mower.transport_width'), model.family === 'DM3000' || model.family === 'DM4000' ? fullLineRecord : detailRecord, model.transportWidth);
      await put(c, machineId, versionId, def('kubota.disc_mower.hitch_category'), model.family === 'DM1000' ? fullLineRecord : detailRecord, model.hitch);
      await put(c, machineId, versionId, def('kubota.disc_mower.drawbar_hitch'), detailRecord, model.drawbarHitch);
      await put(c, machineId, versionId, def('kubota.disc_mower.pto_speed'), model.family === 'DM3000' || model.family === 'DM4000' ? fullLineRecord : detailRecord, model.ptoRpm);
      await put(c, machineId, versionId, def('kubota.disc_mower.minimum_pto_hp'), liveRecord, model.minimumPtoHp, 'hp');
      await put(c, machineId, versionId, def('kubota.disc_mower.discs_blades'), detailRecord, model.discsBlades);
      await put(c, machineId, versionId, def('kubota.disc_mower.remotes'), model.family === 'DM3000' || model.family === 'DM4000' ? fullLineRecord : detailRecord, model.remotes);
      await put(c, machineId, versionId, def('kubota.disc_mower.cutterbar_range'), model.family === 'DM3000' || model.family === 'DM4000' ? fullLineRecord : detailRecord, model.cutterbarRange);
      await put(c, machineId, versionId, def('kubota.disc_mower.stubble_height'), model.family === 'DM3000' || model.family === 'DM4000' ? fullLineRecord : detailRecord, model.stubbleHeight);
    }
  },
};