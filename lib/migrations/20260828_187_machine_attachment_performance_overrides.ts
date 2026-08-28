import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type CountRow=RowDataPacket&{count:number};

async function columnExists(connection:Parameters<DbMigration['apply']>[0],columnName:string){
  const [rows]=await connection.query<CountRow[]>(`
    SELECT COUNT(*) AS count
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE()
      AND TABLE_NAME='machine_attachments'
      AND COLUMN_NAME=?
  `,[columnName]);
  return Number(rows[0]?.count||0)>0;
}

export const machineAttachmentPerformanceOverridesMigration:DbMigration={
  id:'20260828_187_machine_attachment_performance_overrides',
  description:'Add machine-specific attachment performance and configuration overrides for shared loader/backhoe models',
  async apply(connection){
    if(!(await columnExists(connection,'performance_capacity_text'))){
      await connection.query(`ALTER TABLE machine_attachments ADD COLUMN performance_capacity_text TEXT NULL AFTER compatibility_note`);
    }
    if(!(await columnExists(connection,'performance_height_text'))){
      await connection.query(`ALTER TABLE machine_attachments ADD COLUMN performance_height_text TEXT NULL AFTER performance_capacity_text`);
    }
    if(!(await columnExists(connection,'performance_configuration_text'))){
      await connection.query(`ALTER TABLE machine_attachments ADD COLUMN performance_configuration_text TEXT NULL AFTER performance_height_text`);
    }
  },
};
