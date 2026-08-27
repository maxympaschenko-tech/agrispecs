import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Replacement = {
  oldNumber: string;
  oldNormalized: string;
  newNormalized: string;
  name: string;
  categorySlug: string;
  url: string;
  externalId: string;
  title: string;
};

const replacements: Replacement[] = [
  {
    oldNumber: '16414-32434', oldNormalized: '1641432434', newNormalized: 'HH16432430',
    name: 'Legacy Engine Oil Filter', categorySlug: 'engine-oil-filters',
    url: 'https://www.messicks.com/parts/kubota/hh164-32430',
    externalId: 'messicks-kubota-16414-32434-replaced-by-hh164-32430',
    title: 'Kubota 16414-32434 - replaced by HH164-32430',
  },
  {
    oldNumber: 'TC422-82620', oldNormalized: 'TC42282620', newNormalized: 'HH3A082623',
    name: 'Legacy Hydraulic Inlet Filter', categorySlug: 'hydraulic-filters',
    url: 'https://www.messicks.com/parts/kubota/hh3a0-82623',
    externalId: 'messicks-kubota-tc422-82620-replaced-by-hh3a0-82623',
    title: 'Kubota TC422-82620 - replaced by HH3A0-82623',
  },
  {
    oldNumber: 'HHK70-14070', oldNormalized: 'HHK7014070', newNormalized: 'HHK7014073',
    name: 'Legacy HST Oil Filter', categorySlug: 'transmission-filters',
    url: 'https://www.messicks.com/parts/kubota/hhk70-14073',
    externalId: 'messicks-kubota-hhk70-14070-replaced-by-hhk70-14073',
    title: 'Kubota HHK70-14070 - replaced by HHK70-14073',
  },
  {
    oldNumber: 'K7561-14070', oldNormalized: 'K756114070', newNormalized: 'HHK7014073',
    name: 'Legacy HST Oil Filter', categorySlug: 'transmission-filters',
    url: 'https://www.messicks.com/parts/kubota/hhk70-14073',
    externalId: 'messicks-kubota-k7561-14070-replaced-by-hhk70-14073',
    title: 'Kubota K7561-14070 - replaced by HHK70-14073',
  },
  {
    oldNumber: 'K7561-14073', oldNormalized: 'K756114073', newNormalized: 'HHK7014073',
    name: 'Legacy HST Oil Filter', categorySlug: 'transmission-filters',
    url: 'https://www.messicks.com/parts/kubota/hhk70-14073',
    externalId: 'messicks-kubota-k7561-14073-replaced-by-hhk70-14073',
    title: 'Kubota K7561-14073 - replaced by HHK70-14073',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L2502 filter-supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaL2502FilterSupersessionsMigration: DbMigration = {
  id: '20260827_153_kubota_l2502_filter_supersessions',
  description: 'Add legacy-to-current Kubota filter replacements relevant to L2502 service parts',
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

    for (const item of replacements) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [item.categorySlug]);
      const currentPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, item.newNormalized],
      );

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),
           data_status=IF(data_status='verified','verified','partial')`,
        [
          manufacturerId, categoryId, item.oldNumber, item.oldNormalized, item.name,
          `Legacy Kubota filter number. Dealer catalog lists the current replacement for this part.`,
        ],
      );
      const oldPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, item.oldNormalized],
      );

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
        [item.externalId],
      );
      let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId, item.url, item.externalId, item.title],
        );
        sourceRecordId = Number(result.insertId);
      }

      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId, currentPartId, sourceRecordId],
      );
    }
  },
};
