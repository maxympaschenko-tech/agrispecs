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

function hasLeadingIndex(rows: IndexRow[], columns: string[]) {
  return rows.some((row) => {
    const indexedColumns = (row.columns_csv || '').split(',').filter(Boolean);
    return columns.every((column, index) => indexedColumns[index] === column);
  });
}

async function addLeadingIndexIfMissing(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  indexName: string,
  columns: string[],
) {
  const indexes = await loadIndexes(connection, tableName);
  if (hasLeadingIndex(indexes, columns)) return;
  const columnsSql = columns.map((column) => `\`${column}\``).join(',');
  await connection.query(`ALTER TABLE \`${tableName}\` ADD KEY \`${indexName}\` (${columnsSql})`);
}

export const equipmentFacetReadIndexesMigration: DbMigration = {
  id: '20260906_621_equipment_facet_read_indexes',
  description: 'Add only missing leading indexes used by current equipment specification facet reads',
  async apply(connection) {
    await addLeadingIndexIfMissing(
      connection,
      'machine_versions',
      'idx_machine_versions_machine_current',
      ['machine_id', 'is_current'],
    );

    await addLeadingIndexIfMissing(
      connection,
      'machine_specs',
      'idx_machine_specs_machine_version_definition',
      ['machine_id', 'machine_version_id', 'spec_definition_id'],
    );

    await addLeadingIndexIfMissing(
      connection,
      'spec_definitions',
      'idx_spec_definitions_spec_key',
      ['spec_key'],
    );
  },
};
