import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IndexRow = RowDataPacket & {
  index_name: string;
  columns_csv: string | null;
};

async function hasLeadingIndex(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  columns: string[],
) {
  const [rows] = await connection.query<IndexRow[]>(`
    SELECT
      index_name,
      GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS columns_csv
    FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name=?
    GROUP BY index_name
  `, [tableName]);

  return rows.some((row) => {
    const indexedColumns = (row.columns_csv || '').split(',').filter(Boolean);
    return columns.every((column, index) => indexedColumns[index] === column);
  });
}

async function addIndexIfMissing(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  indexName: string,
  columns: string[],
  columnsSql: string,
) {
  if (await hasLeadingIndex(connection, tableName, columns)) return;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD KEY \`${indexName}\` (${columnsSql})`);
}

export const readPathIndexesMigration: DbMigration = {
  id: '20260905_010_read_path_indexes',
  description: 'Add non-duplicate indexes for frequent machine, part, attachment and source read paths',
  async apply(connection) {
    await addIndexIfMissing(
      connection,
      'machines',
      'idx_machines_type_brand_slug_status',
      ['equipment_type_id', 'manufacturer_id', 'slug', 'data_status'],
      '`equipment_type_id`,`manufacturer_id`,`slug`,`data_status`,`id`',
    );

    await addIndexIfMissing(
      connection,
      'parts',
      'idx_parts_number_status_manufacturer',
      ['normalized_part_number', 'data_status'],
      '`normalized_part_number`,`data_status`,`manufacturer_id`,`id`',
    );

    await addIndexIfMissing(
      connection,
      'attachments',
      'idx_attachments_slug_status_manufacturer',
      ['slug', 'data_status'],
      '`slug`,`data_status`,`manufacturer_id`,`id`',
    );

    await addIndexIfMissing(
      connection,
      'source_records',
      'idx_source_records_url',
      ['url'],
      '`url`(191)',
    );
  },
};
