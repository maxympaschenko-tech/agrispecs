import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Line = 'FarmLine' | 'ProLine';
type DetailSource = 'live' | '2026-catalog' | 'te65-85t' | 'te125-145';
type Seed = {
  slug: string;
  model: string;
  line: Line;
  workingWidth: string;
  workingPositionWidth?: string;
  transportWidth: string;
  transportLength: string;
  storageHeight?: string;
  weightLb: number;
  capacityAcresPerHour: number;
  attachment: string;
  rotors: number;
  tineArmsPerRotor?: number;
  minimumHp?: number;
  groundFollowing?: string;
  detailSource: DetailSource;
  notes: string;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/tedders';
const FULL_LINE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const TE65_85T_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/te65_85t_specs.pdf?sfvrsn=d7f8c998_2';
const TE125_145_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/kubota-te12513c-te14515c-spec-sheet-%281%29.pdf?sfvrsn=5f88e9ff_3';

const models: Seed[] = [
  {
    slug: 'te4052t', model: 'TE4052T', line: 'FarmLine', workingWidth: `17' 1"`, workingPositionWidth: `17' 9"`, transportWidth: `9' 6"`, transportLength: `9' 6"`, storageHeight: `8' 8"`, weightLb: 904, capacityAcresPerHour: 10.4, attachment: 'Pull-type / trailing; current live page describes pull-type design', rotors: 4, tineArmsPerRotor: 6, minimumHp: 20, detailSource: 'live',
    notes: 'Current Kubota USA live page publishes 17 ft 1 in working width, 904 lb and 20 hp. The 2026 full-line catalog publishes 1,014 lb for TE4052T and older Kubota tedder material publishes an 8 ft 6 in transport length; this current version keeps the live 904 lb value while retaining the 2026 catalog 9 ft 6 in transport length and records the conflict rather than reconciling it silently.',
  },
  {
    slug: 'te6576c', model: 'TE6576C', line: 'ProLine', workingWidth: `24' 11"`, workingPositionWidth: `25' 7"`, transportWidth: `9' 9"`, transportLength: `14' 9"`, storageHeight: `13' 7"`, weightLb: 2822, capacityAcresPerHour: 15.1, attachment: 'Pull-type drawbar per current live product copy', rotors: 6, tineArmsPerRotor: 7, groundFollowing: 'TerraFlow ground-following system', detailSource: '2026-catalog',
    notes: 'Current Kubota live copy explicitly describes TE6576C as 24 ft 11 in working width with a pull-type drawbar. The 2026 full-line table prints 25 ft 7 in in its Working Width row; that number matches the working-position width published for the earlier TE6576CD family. This version retains the live 24 ft 11 in working width, uses 25 ft 7 in only as working-position width, and keeps the 2026 TE6576C weight of 2,822 lb.',
  },
  {
    slug: 'te6583t', model: 'TE6583T', line: 'FarmLine', workingWidth: `27' 3"`, workingPositionWidth: `28' 5"`, transportWidth: `9' 10"`, transportLength: `17' 9"`, storageHeight: `4' 1"`, weightLb: 1984, capacityAcresPerHour: 16.3, attachment: 'Linkage drawbar standard', rotors: 6, tineArmsPerRotor: 7, detailSource: 'te65-85t',
    notes: 'Current model status comes from the live Kubota USA Tedders page; detailed dimensions, weight and rotor geometry come from the recent TE6583T/TE8511T specification sheet. Kubota does not expose a minimum-horsepower value for this model in the current live card, so none is invented.',
  },
  {
    slug: 'te8511t', model: 'TE8511T', line: 'FarmLine', workingWidth: `36' 1"`, workingPositionWidth: `37' 1"`, transportWidth: `9' 6"`, transportLength: `23' 8"`, storageHeight: `4' 1"`, weightLb: 2679, capacityAcresPerHour: 21.7, attachment: 'Linkage drawbar standard', rotors: 8, tineArmsPerRotor: 7, detailSource: 'te65-85t',
    notes: 'Current model status comes from the live Kubota USA Tedders page; detailed dimensions, weight and rotor geometry come from the recent TE6583T/TE8511T specification sheet. Kubota does not expose a minimum-horsepower value for this model in the current live card, so none is invented.',
  },
  {
    slug: 'te8590c', model: 'TE8590C', line: 'ProLine', workingWidth: `29' 6"`, transportWidth: `9' 6"`, transportLength: `13' 8"`, storageHeight: `12' 2"`, weightLb: 3747, capacityAcresPerHour: 7.2, attachment: 'ProLine trailed configuration', rotors: 8, groundFollowing: 'TerraFlow ground-following system', detailSource: '2026-catalog',
    notes: 'Current model status and TerraFlow feature come from the live Kubota page. The 2026 full-line table supplies model-specific dimensions, weight and capacity. Older Tedders & Rakes brochures list TE8511C rather than TE8590C; those TE8511C values are not transferred to this machine.',
  },
  {
    slug: 'te10511c', model: 'TE10511C', line: 'ProLine', workingWidth: `36' 9"`, transportWidth: `9' 7"`, transportLength: `13' 9"`, storageHeight: `12' 9"`, weightLb: 4905, capacityAcresPerHour: 9.8, attachment: 'ProLine trailed configuration', rotors: 10, minimumHp: 70, groundFollowing: 'TerraFlow ground-following system', detailSource: '2026-catalog',
    notes: 'Current Kubota USA live card publishes 70 hp and identifies TE10511C as a current large-width tedder. Dimensions, weight, capacity and rotor count use the 2026 full-line catalog.',
  },
  {
    slug: 'te12513c', model: 'TE12513C', line: 'ProLine', workingWidth: `43' 11"`, workingPositionWidth: `45' 6"`, transportWidth: `9' 8"`, transportLength: `22' 2"`, storageHeight: `9' 5"`, weightLb: 8378, capacityAcresPerHour: 10.7, attachment: 'Fixed 40 mm hitch towing eye', rotors: 12, tineArmsPerRotor: 6, minimumHp: 80, groundFollowing: 'TerraFlow ground-following system', detailSource: 'te125-145',
    notes: 'Current Kubota USA live card publishes 80 hp. The recent TE12513C/TE14515C spec sheet supplies 43 ft 11 in working width, 45 ft 6 in working-position width, 9 ft 8 in transport width, 22 ft 2 in transport length, 9 ft 5 in storage height, 8,378 lb weight, 12 rotors and 6 tine arms per rotor.',
  },
  {
    slug: 'te14515c', model: 'TE14515C', line: 'ProLine', workingWidth: `51' 2"`, transportWidth: `9' 8"`, transportLength: `22' 2"`, weightLb: 9150, capacityAcresPerHour: 12.5, attachment: 'Fixed 40 mm hitch towing eye', rotors: 14, minimumHp: 100, groundFollowing: 'TerraFlow ground-following system', detailSource: 'te125-145',
    notes: 'Current Kubota USA live card publishes 100 hp and confirms 51 ft 2 in maximum working width for the current line. Weight and rotor count are confirmed by the recent TE12513C/TE14515C specification sheet and the 2026 full-line catalog. Fields not exposed unambiguously for TE14515C in the recent spec-sheet parse are not invented.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'kubota.tedder.line', 'Kubota tedder line', 'text', null, 3],
  ['Tedder Performance', 'kubota.tedder.working_width', 'Working width', 'text', null, 10],
  ['Tedder Performance', 'kubota.tedder.working_position_width', 'Width in working position', 'text', null, 20],
  ['Tedder Performance', 'kubota.tedder.capacity', 'Theoretical capacity', 'decimal', 'acres/h', 30],
  ['Dimensions & Weight', 'kubota.tedder.transport_width', 'Transport width', 'text', null, 10],
  ['Dimensions & Weight', 'kubota.tedder.transport_length', 'Transport length', 'text', null, 20],
  ['Dimensions & Weight', 'kubota.tedder.storage_height', 'Storage height', 'text', null, 30],
  ['Dimensions & Weight', 'kubota.tedder.approx_weight', 'Approximate weight', 'decimal', 'lb', 40],
  ['Attachment to Tractor', 'kubota.tedder.attachment', 'Attachment / hitch', 'text', null, 10],
  ['Attachment to Tractor', 'kubota.tedder.minimum_hp', 'Minimum horsepower shown by current Kubota card', 'decimal', 'hp', 20],
  ['Rotors & Tines', 'kubota.tedder.rotors', 'Number of rotors', 'integer', null, 10],
  ['Rotors & Tines', 'kubota.tedder.tine_arms_per_rotor', 'Tine arms per rotor', 'integer', null, 20],
  ['Rotors & Tines', 'kubota.tedder.ground_following', 'Ground-following system', 'text', null, 30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, p);
  if (!rows[0]) throw new Error('Kubota tedder migration dependency missing');
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

export const kubotaCurrentTeddersMigration: DbMigration = {
  id: '20260901_574_kubota_current_tedders',
  description: 'Add current Kubota USA rotary tedders with live lineup status, source-specific geometry and documented publication conflicts',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Tedder','rotary-tedder') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='rotary-tedder' LIMIT 1`);
    const sourceId = await source(c);

    const records = {
      live: await record(c, sourceId, LIVE_URL, 'kubota-tedders-live-current-2026-09', 'Kubota USA current Tedders lineup', { captured: '2026-09-01', currentModels: models.map((m) => m.model) }),
      '2026-catalog': await record(c, sourceId, FULL_LINE_URL, 'kubota-2026-full-line-tedders', 'Kubota USA 2026 Full Product Line - Tedders', { captured: '2026-09-01', pages: '52-53', models: ['TE4052T', 'TE6576C', 'TE8590C', 'TE10511C', 'TE12513C', 'TE14515C'] }),
      'te65-85t': await record(c, sourceId, TE65_85T_URL, 'kubota-te6583t-te8511t-current-specs', 'Kubota TE6583T and TE8511T specification sheet', { captured: '2026-09-01', models: ['TE6583T', 'TE8511T'] }),
      'te125-145': await record(c, sourceId, TE125_145_URL, 'kubota-te12513c-te14515c-current-specs', 'Kubota TE12513C and TE14515C specification sheet', { captured: '2026-09-01', models: ['TE12513C', 'TE14515C'] }),
    } as const;

    const seriesIds = new Map<Line, number>();
    for (const line of ['FarmLine', 'ProLine'] as Line[]) {
      const seriesSlug = `kubota-tedder-${line.toLowerCase()}`;
      await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, `Kubota ${line} Tedders`, seriesSlug]);
      seriesIds.set(line, await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, seriesSlug]));
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Kubota tedder definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = seriesIds.get(model.line);
      if (!seriesId) throw new Error(`Missing Kubota tedder line ${model.line}`);
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Kubota USA rotary tedder from live manufacturer lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current Kubota USA rotary tedder',TRUE,?,?)
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,
        [machineId, VERSION, records.live, model.notes],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const detailRecord = records[model.detailSource];

      await put(c, machineId, versionId, def('configuration.type'), records.live, 'Rotary tedder');
      await put(c, machineId, versionId, def('configuration.market_scope'), records.live, 'United States current lineup');
      await put(c, machineId, versionId, def('kubota.tedder.line'), detailRecord, model.line);
      await put(c, machineId, versionId, def('kubota.tedder.working_width'), model.slug === 'te4052t' || model.slug === 'te6576c' ? records.live : detailRecord, model.workingWidth);
      if (model.workingPositionWidth) await put(c, machineId, versionId, def('kubota.tedder.working_position_width'), detailRecord, model.workingPositionWidth);
      await put(c, machineId, versionId, def('kubota.tedder.capacity'), detailRecord, model.capacityAcresPerHour, 'acres/h');
      await put(c, machineId, versionId, def('kubota.tedder.transport_width'), detailRecord, model.transportWidth);
      await put(c, machineId, versionId, def('kubota.tedder.transport_length'), detailRecord, model.transportLength);
      if (model.storageHeight) await put(c, machineId, versionId, def('kubota.tedder.storage_height'), detailRecord, model.storageHeight);
      await put(c, machineId, versionId, def('kubota.tedder.approx_weight'), model.slug === 'te4052t' ? records.live : detailRecord, model.weightLb, 'lb');
      await put(c, machineId, versionId, def('kubota.tedder.attachment'), model.slug === 'te6576c' ? records.live : detailRecord, model.attachment);
      if (model.minimumHp !== undefined) await put(c, machineId, versionId, def('kubota.tedder.minimum_hp'), records.live, model.minimumHp, 'hp');
      await put(c, machineId, versionId, def('kubota.tedder.rotors'), detailRecord, model.rotors);
      if (model.tineArmsPerRotor !== undefined) await put(c, machineId, versionId, def('kubota.tedder.tine_arms_per_rotor'), detailRecord, model.tineArmsPerRotor);
      if (model.groundFollowing) await put(c, machineId, versionId, def('kubota.tedder.ground_following'), records.live, model.groundFollowing);
    }
  },
};