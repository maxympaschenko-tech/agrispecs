import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type ModelSlug = 'l3302' | 'l3902';
type VersionSlug = 'us-current-gear-4wd' | 'us-current-hst-4wd';

type FilterSeed = {
  normalizedPartNumber: string;
  versions: VersionSlug[];
};

const filters: FilterSeed[] = [
  { normalizedPartNumber: 'HH16432430', versions: ['us-current-gear-4wd','us-current-hst-4wd'] },
  { normalizedPartNumber: 'HH1J143172', versions: ['us-current-gear-4wd','us-current-hst-4wd'] },
  { normalizedPartNumber: 'HH3A082623', versions: ['us-current-gear-4wd','us-current-hst-4wd'] },
  { normalizedPartNumber: 'TC82093230', versions: ['us-current-gear-4wd','us-current-hst-4wd'] },
  { normalizedPartNumber: 'HHK7014073', versions: ['us-current-hst-4wd'] },
];

const HST_SOURCE = {
  url: 'https://www.messicks.com/parts/kubota/kukit5',
  externalId: 'messicks-kukit5-l3302-l3902-hst-filter-kit',
  title: 'Messicks KUKIT5 L3302 L3902 HST Filter Kit - component fitment',
};

const GEAR_SOURCES: Record<ModelSlug, { url:string; externalId:string; title:string }> = {
  l3302: {
    url: 'https://www.messicks.com/catalogs/kubota/l3302dt',
    externalId: 'messicks-kubota-l3302dt-service-filter-catalog',
    title: 'Kubota L3302DT parts catalog - frequently used service filters',
  },
  l3902: {
    url: 'https://www.messicks.com/catalogs/kubota/l3902dt',
    externalId: 'messicks-kubota-l3902dt-service-filter-catalog',
    title: 'Kubota L3902DT parts catalog - frequently used service filters',
  },
};

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L3302/L3902 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0], sourceId: number,
  source: { url:string; externalId:string; title:string },
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [source.externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,source.url,source.externalId,source.title],
  );
  return Number(result.insertId);
}

async function upsertVersionFitment(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number, machineVersionId: number, partId: number, sourceRecordId: number,
  fitmentNote: string, configurationNote: string,
) {
  const [existing] = await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts
     WHERE machine_id=? AND machine_version_id=? AND part_id=?
       AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL
     ORDER BY id DESC LIMIT 1`,
    [machineId,machineVersionId,partId],
  );
  if (existing[0]) {
    await connection.query(
      `UPDATE machine_parts
       SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high'
       WHERE id=?`,
      [fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)],
    );
  } else {
    await connection.query(
      `INSERT INTO machine_parts
        (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,'high')`,
      [machineId,machineVersionId,partId,fitmentNote,configurationNote,sourceRecordId],
    );
  }
}

export const kubotaL3302L3902ServiceFiltersMigration: DbMigration = {
  id: '20260827_157_kubota_l3302_l3902_service_filters',
  description: 'Add configuration-aware Kubota L3302/L3902 service-filter fitments, including exact HST filter-kit components',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const hstSourceRecordId = await ensureSourceRecord(connection,sourceId,HST_SOURCE);
    const gearSourceRecordIds = new Map<ModelSlug,number>();
    for (const modelSlug of ['l3302','l3902'] as const) {
      gearSourceRecordIds.set(modelSlug,await ensureSourceRecord(connection,sourceId,GEAR_SOURCES[modelSlug]));
    }

    for (const modelSlug of ['l3302','l3902'] as const) {
      const machineId = await selectId(connection, `
        SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
      `,[modelSlug]);

      for (const filter of filters) {
        const partId = await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId,filter.normalizedPartNumber],
        );

        for (const versionSlug of filter.versions) {
          const versionId = await selectId(
            connection,
            `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
            [machineId,versionSlug],
          );
          const sourceRecordId = versionSlug === 'us-current-hst-4wd'
            ? hstSourceRecordId
            : gearSourceRecordIds.get(modelSlug);
          if (!sourceRecordId) throw new Error(`Missing ${modelSlug} service-filter source.`);

          const partNumberRow = await connection.query<(RowDataPacket & { part_number:string })[]>(
            `SELECT part_number FROM parts WHERE id=? LIMIT 1`, [partId],
          );
          const partNumber = partNumberRow[0][0]?.part_number || filter.normalizedPartNumber;
          const hstOnly = filter.normalizedPartNumber === 'HHK7014073';

          await upsertVersionFitment(
            connection,
            machineId,
            versionId,
            partId,
            sourceRecordId,
            versionSlug === 'us-current-hst-4wd'
              ? `Messicks KUKIT5 explicitly lists ${partNumber} in the L3302/L3902 HST filter kit. Confirm exact tractor serial number before ordering.`
              : `Messicks' ${modelSlug.toUpperCase()}DT parts catalog and current component fitment references support ${partNumber} for this gear-drive model. Confirm exact tractor serial number before ordering.`,
            hstOnly ? 'HST-only transmission oil filter' : `${modelSlug.toUpperCase()} ${versionSlug.includes('hst') ? 'HST' : 'gear-drive'} service-filter reference`,
          );
        }
      }
    }
  },
};
