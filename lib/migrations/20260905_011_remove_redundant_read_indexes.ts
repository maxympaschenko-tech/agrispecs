import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IndexRow = RowDataPacket & {
  index_name: string;
  columns_csv: string | null;
};

async function loadIndexes(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
) {
  const [rows] = await connection.query<IndexRow[]>(`
    SELECT
      index_name,
      GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS columns_csv
    FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name=?
    GROUP BY index_name
  `, [tableName]);
  return rows;
}

function hasLeadingIndex(
  rows: IndexRow[],
  columns: string[],
  excludeIndexName?: string,
) {
  return rows.some((row) => {
    if (excludeIndexName && row.index_name === excludeIndexName) return false;
    const indexedColumns = (row.columns_csv || '').split(',').filter(Boolean);
    return columns.every((column, index) => indexedColumns[index] === column);
  });
}

async function dropIfRedundant(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  indexName: string,
  alternativeLeadingColumns: string[],
) {
  const indexes = await loadIndexes(connection, tableName);
  const targetExists = indexes.some((row) => row.index_name === indexName);
  if (!targetExists) return;

  const alternativeExists = hasLeadingIndex(indexes, alternativeLeadingColumns, indexName);
  if (!alternativeExists) return;

  await connection.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
}

export const removeRedundantReadIndexesMigration: DbMigration = {
  id: '20260905_011_remove_redundant_read_indexes',
  description: 'Remove redundant read indexes when baseline machine and part lookup indexes already cover those paths',
  async apply(connection) {
    await dropIfRedundant(
      connection,
      'machines',
      'idx_machines_type_brand_slug_status',
      ['manufacturer_id', 'equipment_type_id', 'slug'],
    );

    await dropIfRedundant(
      connection,
      'parts',
      'idx_parts_number_status_manufacturer',
      ['normalized_part_number'],
    );
  },
};
