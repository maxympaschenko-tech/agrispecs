import type { PoolConnection } from 'mysql2/promise';

export type DbMigration = {
  id: string;
  description: string;
  apply: (connection: PoolConnection) => Promise<void>;
};
