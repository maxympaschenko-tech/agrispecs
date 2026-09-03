import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartSeed = {
  number: '48138563' | '47450038' | '84581942';
  name: string;
  category: 'engine-oil-filters' | 'fuel-filters' | 'hydraulic-filters';
  officialUrl: string;
};
type ModelSeed = {
  slug: 'powerstar-90' | 'powerstar-100' | 'powerstar-110' | 'powerstar-120';
  model: string;
  configuration: string;
  sourceUrl: string;
  sourceExternalId: string;
};

const CURRENT_VERSION = 'united-states-current-2026-09-next-generation';

const parts: PartSeed[] = [
  {
    number: '48138563',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/filter-oil-oe/engine-oil-filter/p/48138563',
  },
  {
    number: '47450038',
    name: 'Fuel Pre-Filter',
    category: 'fuel-filters',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/fuel-filters/fuel-filter/p/47450038',
  },
  {
    number: '84581942',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandce/category/filters/hydraulic-filters/hydraulic-oil-filter/p/84581942',
  },
];

const models: ModelSeed[] = [
  {
    slug: 'powerstar-90',
    model: 'PowerStar 90',
    configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)',
    sourceUrl: 'https://www.messicks.com/catalogs/new-holland/powerstar-90-dual-command-tractor-1-5-wide-st/35-hydraulic-systems/35-204-be-040-35-204-be-040-3-remote-control-valves-components-80-lpm-var-351290001-351290002-351290003-351292001-351292002-351292003-351298001-351298002-351298003-tech-type-powerstar-90-dc-1-5-cab-my',
    sourceExternalId: 'messicks-powerstar-90-stagev-my24-core-filters-2026-09',
  },
  {
    slug: 'powerstar-100',
    model: 'PowerStar 100',
    configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)',
    sourceUrl: 'https://www.messicks.com/catalogs/new-holland/powerstar-100-dual-command-tractor-1-5-wide-s/55-electrical-systems/55-404-bs-080-55-404-bs-080-roof-work-light-front-var-349070007-349142007-350293003-350294003-350295004-350296004-350297003-350298003-351382001-351383001-351383002-351384001-351385001-351385002-351386',
    sourceExternalId: 'messicks-powerstar-100-stagev-my24-core-filters-2026-09',
  },
  {
    slug: 'powerstar-110',
    model: 'PowerStar 110',
    configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)',
    sourceUrl: 'https://www.messicks.com/catalogs/new-holland/powerstar-110-dual-command-tractor-1-5-wide-s/10-engine/10-400-bg-020-10-400-bg-020-radiator-frame-conveyor-var-351001013-351001014-351001015-351001016-351001017-351001018-351001019-351001020-351001021-351002009-351002010-351002011-351002012-351002013-3510',
    sourceExternalId: 'messicks-powerstar-110-stagev-my24-core-filters-2026-09',
  },
  {
    slug: 'powerstar-120',
    model: 'PowerStar 120',
    configuration: 'Dual Command 1.5, Stage V, ROPS, MY24 catalog (09/25)',
    sourceUrl: 'https://www.messicks.com/catalogs/new-holland/powerstar-120-dual-command-tractor-1-5-wide-s/10-engine/10-250-010-10-250-010-turbocharger',
    sourceExternalId: 'messicks-powerstar-120-stagev-my24-core-filters-2026-09',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar Stage V filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandPowerStarStageVCoreFiltersMigration: DbMigration = {
  id: '20260903_598_new_holland_powerstar_stagev_core_filters',
  description: 'Add exact Stage V PowerStar 90/100/110/120 core engine-oil, fuel-pre-filter and hydraulic-filter fitment to the next-generation current version',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );

    let [messicksRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let messicksSourceId = messicksRows[0]?.id ? Number(messicksRows[0].id) : 0;
    if (!messicksSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      messicksSourceId = Number(result.insertId);
    }

    const categoryIds = new Map<string, number>();
    for (const slug of ['engine-oil-filters', 'fuel-filters', 'hydraulic-filters']) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const partIds = new Map<string, number>();
    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing category ${part.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number, part.name],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.number],
      );
      partIds.set(part.number, partId);

      await ensureSourceRecord(
        connection,
        officialSourceId,
        `new-holland-mycnh-${part.number.toLowerCase()}-identity-2026-09`,
        part.officialUrl,
        `New Holland MyCNH ${part.number} ${part.name}`,
        {
          role: 'Official OEM part identity corroboration',
          partNumber: part.number,
          name: part.name,
          fitmentScope: 'Identity only; exact PowerStar model/configuration fitment is sourced separately from the parts catalog.',
        },
      );
    }

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      const sourceRecordId = await ensureSourceRecord(
        connection,
        messicksSourceId,
        model.sourceExternalId,
        model.sourceUrl,
        `Messick's ${model.model} Stage V MY24 catalog core filter references`,
        {
          role: 'Exact model and Stage V configuration evidence',
          model: model.model,
          configuration: model.configuration,
          catalogEvidence: 'The exact model catalog page identifies 48138563 engine oil filter, 47450038 fuel filter cartridge/pre-filter and 84581942 hydraulic filter in the machine catalog/frequent-purchase references.',
          supportedParts: ['48138563', '47450038', '84581942'],
          confidence: 'secondary/high',
          guardrail: 'This row does not assert fitment to other PowerStar configurations, model years or PowerStar 75.',
        },
      );

      for (const part of parts) {
        const partId = partIds.get(part.number);
        if (!partId) throw new Error(`Missing part ${part.number}.`);
        const configurationNote = `Next-generation US PowerStar; ${model.configuration}`;
        const fitmentNote = `${part.name} appears in the exact ${model.model} ${model.configuration} parts catalog. Confirm transmission/operator-station build configuration before ordering; PowerStar 75 is not inferred from this evidence.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, sourceRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, configurationNote, fitmentNote, sourceRecordId],
          );
        }
      }
    }
  },
};
