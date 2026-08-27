import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type CountRow = RowDataPacket & { count: number };

async function hasIndex(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  indexName: string,
) {
  const [rows] = await connection.query<CountRow[]>(`
    SELECT COUNT(*) AS count
    FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name=? AND index_name=?
  `, [tableName,indexName]);
  return Number(rows[0]?.count || 0) > 0;
}

async function addIndexIfMissing(
  connection: Parameters<DbMigration['apply']>[0],
  tableName: string,
  indexName: string,
  columnsSql: string,
) {
  if (await hasIndex(connection,tableName,indexName)) return;
  await connection.query(`ALTER TABLE \`${tableName}\` ADD KEY \`${indexName}\` (${columnsSql})`);
}

export const catalogPerformanceIndexesMigration: DbMigration = {
  id: '20260827_119_catalog_performance_indexes',
  description: 'Add indexes used by source lookup, parts catalog, reverse fitment and replacement queries',
  async apply(connection) {
    await addIndexIfMissing(connection,'source_records','idx_source_records_external_id','`external_id`');
    await addIndexIfMissing(connection,'parts','idx_parts_status_category','`data_status`,`category_id`,`id`');
    await addIndexIfMissing(connection,'machine_parts','idx_machine_parts_part_machine','`part_id`,`machine_id`');
    await addIndexIfMissing(connection,'part_cross_references','idx_part_cross_target','`cross_part_id`,`part_id`,`relation_type`');
    await addIndexIfMissing(connection,'machines','idx_machines_type_status_brand','`equipment_type_id`,`data_status`,`manufacturer_id`,`id`');
  },
};
