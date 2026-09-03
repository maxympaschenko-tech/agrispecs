import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartNumber = '48138563' | '47450037' | '47450038' | '84581942';
type ModelSeed = {
  slug: 't5-110' | 't5-120';
  model: string;
  url: string;
  externalId: string;
  parts: PartNumber[];
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const CONFIGURATION = 'ElectroCommand, Stage V, North America, 10/21 catalog';

const partDefs: Record<PartNumber, { name: string; category: string }> = {
  '48138563': { name: 'Engine Oil Filter', category: 'engine-oil-filters' },
  '47450037': { name: 'Fuel Filter Cartridge', category: 'fuel-filters' },
  '47450038': { name: 'Fuel Pre-Filter', category: 'fuel-filters' },
  '84581942': { name: 'Hydraulic Oil Filter', category: 'hydraulic-filters' },
};

const models: ModelSeed[] = [
  {
    slug: 't5-110',
    model: 'T5.110',
    url: 'https://www.messicks.com/catalogs/new-holland/t5-110-electrocommand-tractor-stage-v-na-10-2/55-electrical-systems/55-100-090-55-100-090-var-762250-762251-762252-762253-762254-762255-762256-main-harness-fuse-box-relay-rh-var-331444884-331444886-332147884-332147886-334114880-334115882-334117880-334117882-334775880',
    externalId: 'messicks-t5-110-ec-stagev-na-core-filters-2026-09',
    parts: ['48138563', '47450037', '47450038'],
  },
  {
    slug: 't5-120',
    model: 'T5.120',
    url: 'https://www.messicks.com/catalogs/new-holland/t5-120-electrocommand-tractor-stage-v-na-10-2/10-engine/10-216-020-10-216-020-var-759656-fuel-tank-w-o-lockable-fuel-cap-components-var-390210880-tech-type-t5-120-ec-stage-v-na',
    externalId: 'messicks-t5-120-ec-stagev-na-core-filters-2026-09',
    parts: ['48138563', '47450037', '47450038', '84581942'],
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 ElectroCommand Stage V core-filter migration dependency.');
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

export const newHollandT5EcStageVCoreFiltersMigration: DbMigration = {
  id: '20260903_607_new_holland_t5_ec_stagev_core_filters',
  description: 'Add exact T5.110/T5.120 ElectroCommand Stage V North America service-filter rows without forcing symmetric fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    const partIds = new Map<PartNumber, number>();
    for (const [partNumber, def] of Object.entries(partDefs) as Array<[PartNumber, (typeof partDefs)[PartNumber]]>) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [def.category]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, partNumber, partNumber, def.name],
      );
      partIds.set(
        partNumber,
        await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, partNumber],
        ),
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    for (const model of models) {
      const sourceRecordId = await ensureSourceRecord(
        connection,
        sourceId,
        model.externalId,
        model.url,
        `Messick's ${model.model} ElectroCommand Stage V North America service-parts catalog`,
        {
          role: 'Exact model/configuration fitment evidence',
          model: model.model,
          configuration: CONFIGURATION,
          listedParts: model.parts.map((partNumber) => ({ partNumber, name: partDefs[partNumber].name })),
          evidence: `The exact ${model.model} ElectroCommand Stage V (NA) 10/21 catalog exposes these filters in its machine-specific frequently purchased/service parts list.`,
          confidence: 'secondary/high',
          guardrail: model.slug === 't5-110'
            ? '84581942 is not inserted for T5.110 here because the captured T5.110 NA evidence visibly lists only 48138563, 47450037 and 47450038 in the relevant excerpt. T5.120 has direct visible evidence for all four.'
            : 'Fitment is limited to the exact T5.120 ElectroCommand Stage V North America configuration. Other transmissions and T5 models are not inferred.',
        },
      );

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

      for (const partNumber of model.parts) {
        const partId = partIds.get(partNumber);
        if (!partId) throw new Error(`Missing ${partNumber} dependency.`);
        const fitmentNote = `${partNumber} ${partDefs[partNumber].name} is listed in the exact ${model.model} ElectroCommand Stage V North America 10/21 catalog. Confirm transmission and build configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, CONFIGURATION],
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
            [machineId, partId, machineVersionId, CONFIGURATION, fitmentNote, sourceRecordId],
          );
        }
      }
    }
  },
};
