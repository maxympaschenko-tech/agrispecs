import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Family = 'DMC6300' | 'DMC7300' | 'DMC8000' | 'DMC8500';
type Seed = {
  slug: string;
  model: string;
  family: Family;
  minimumPtoHp: number;
  conditionerType: string;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/disc-mower-conditioners';
const OFFER_URL = 'https://www.kubotausa.com/special-offer/disc-mower-conditioner-series';

const models: Seed[] = [
  { slug: 'dmc6332t', model: 'DMC6332T', family: 'DMC6300', minimumPtoHp: 90, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc6332r', model: 'DMC6332R', family: 'DMC6300', minimumPtoHp: 90, conditionerType: 'Roller conditioner' },
  { slug: 'dmc6336tvario', model: 'DMC6336Tvario', family: 'DMC6300', minimumPtoHp: 120, conditionerType: 'SemiSwing tine conditioner / Vario configuration' },
  { slug: 'dmc63100t', model: 'DMC63100T', family: 'DMC6300', minimumPtoHp: 200, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc63100r', model: 'DMC63100R', family: 'DMC6300', minimumPtoHp: 200, conditionerType: 'Roller conditioner' },
  { slug: 'dmc7332t', model: 'DMC7332T', family: 'DMC7300', minimumPtoHp: 75, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc7332r', model: 'DMC7332R', family: 'DMC7300', minimumPtoHp: 75, conditionerType: 'Roller conditioner' },
  { slug: 'dmc7336t', model: 'DMC7336T', family: 'DMC7300', minimumPtoHp: 80, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc7336r', model: 'DMC7336R', family: 'DMC7300', minimumPtoHp: 80, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8028t', model: 'DMC8028T', family: 'DMC8000', minimumPtoHp: 70, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8028r', model: 'DMC8028R', family: 'DMC8000', minimumPtoHp: 70, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8032t', model: 'DMC8032T', family: 'DMC8000', minimumPtoHp: 80, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8032r', model: 'DMC8032R', family: 'DMC8000', minimumPtoHp: 80, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8032rs', model: 'DMC8032RS', family: 'DMC8000', minimumPtoHp: 60, conditionerType: 'Steel roller conditioner' },
  { slug: 'dmc8036t', model: 'DMC8036T', family: 'DMC8000', minimumPtoHp: 90, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8036r', model: 'DMC8036R', family: 'DMC8000', minimumPtoHp: 90, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8036rs', model: 'DMC8036RS', family: 'DMC8000', minimumPtoHp: 90, conditionerType: 'Steel roller conditioner' },
  { slug: 'dmc8532t', model: 'DMC8532T', family: 'DMC8500', minimumPtoHp: 80, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8532r', model: 'DMC8532R', family: 'DMC8500', minimumPtoHp: 80, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8532rs', model: 'DMC8532RS', family: 'DMC8500', minimumPtoHp: 80, conditionerType: 'Steel roller conditioner' },
  { slug: 'dmc8536t', model: 'DMC8536T', family: 'DMC8500', minimumPtoHp: 90, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8536r', model: 'DMC8536R', family: 'DMC8500', minimumPtoHp: 90, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8536rs', model: 'DMC8536RS', family: 'DMC8500', minimumPtoHp: 90, conditionerType: 'Steel roller conditioner' },
  { slug: 'dmc8540t', model: 'DMC8540T', family: 'DMC8500', minimumPtoHp: 100, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8540r', model: 'DMC8540R', family: 'DMC8500', minimumPtoHp: 100, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8540rs', model: 'DMC8540RS', family: 'DMC8500', minimumPtoHp: 100, conditionerType: 'Steel roller conditioner' },
  { slug: 'dmc8547t', model: 'DMC8547T', family: 'DMC8500', minimumPtoHp: 120, conditionerType: 'SemiSwing tine conditioner' },
  { slug: 'dmc8547r', model: 'DMC8547R', family: 'DMC8500', minimumPtoHp: 120, conditionerType: 'Roller conditioner' },
  { slug: 'dmc8547rs', model: 'DMC8547RS', family: 'DMC8500', minimumPtoHp: 120, conditionerType: 'Steel roller conditioner' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'kubota.dmc.series', 'Kubota disc mower conditioner series', 'text', null, 3],
  ['Conditioning', 'kubota.dmc.conditioner_type', 'Conditioner type', 'text', null, 10],
  ['Attachment to Tractor', 'kubota.dmc.minimum_pto_hp', 'Minimum PTO horsepower required', 'decimal', 'hp', 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, p);
  if (!rows[0]) throw new Error('Kubota disc mower conditioner migration dependency missing');
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

export const kubotaCurrentDiscMowerConditionersMigration: DbMigration = {
  id: '20260901_573_kubota_current_disc_mower_conditioners',
  description: 'Register the complete current Kubota USA disc mower conditioner lineup with current model-card PTO requirements',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Disc Mower Conditioner','disc-mower-conditioner') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='disc-mower-conditioner' LIMIT 1`);
    const sourceId = await source(c);

    const liveRecord = await record(c, sourceId, LIVE_URL, 'kubota-dmc-live-current-2026-09', 'Kubota USA current Disc Mower Conditioners lineup', { captured: '2026-09-01', market: 'United States', modelCount: models.length, models });
    await record(c, sourceId, OFFER_URL, 'kubota-dmc-current-offer-2026-09', 'Kubota USA current Disc Mower Conditioner Series offer', { captured: '2026-09-01', offerEnds: '2026-09-30', models: models.map((m) => m.model) });

    const seriesIds = new Map<Family, number>();
    for (const family of ['DMC6300', 'DMC7300', 'DMC8000', 'DMC8500'] as Family[]) {
      const slug = `kubota-${family.toLowerCase()}`;
      await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, `Kubota ${family} Series`, slug]);
      seriesIds.set(family, await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, slug]));
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Kubota DMC definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = seriesIds.get(model.family);
      if (!seriesId) throw new Error(`Missing Kubota DMC series ${model.family}`);
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Kubota USA disc mower conditioner from live manufacturer lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Kubota USA live DMC model',TRUE,?,'Current-model status and horsepower requirement captured from Kubota USA live Disc Mower Conditioners page on 2026-09-01. Detailed dimensions and weights are intentionally deferred to source-specific family specification migrations so older and newer DMC publications are not silently mixed.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,
        [machineId, VERSION, liveRecord],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(c, machineId, versionId, def('configuration.type'), liveRecord, 'Disc mower conditioner');
      await put(c, machineId, versionId, def('configuration.market_scope'), liveRecord, 'United States current lineup');
      await put(c, machineId, versionId, def('kubota.dmc.series'), liveRecord, model.family);
      await put(c, machineId, versionId, def('kubota.dmc.conditioner_type'), liveRecord, model.conditionerType);
      await put(c, machineId, versionId, def('kubota.dmc.minimum_pto_hp'), liveRecord, model.minimumPtoHp, 'hp');
    }
  },
};