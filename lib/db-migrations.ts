import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';
import type { DbMigration } from '@/lib/db-migration-types';
import { johnDeere3Series2026Migration } from '@/lib/migrations/20260827_010_john_deere_3_series';

type AppliedMigrationRow = RowDataPacket & { id: string };
type LockRow = RowDataPacket & { acquired: number | null };

const migrations: DbMigration[] = [
  {
    id: '20260827_000_existing_schema_baseline',
    description: 'Baseline for schema and data imported manually before automated migrations were enabled',
    apply: async () => {},
  },
  johnDeere3Series2026Migration,
];

let migrationPromise: Promise<void> | null = null;

async function applyMigrations() {
  const pool = getDb();
  const connection = await pool.getConnection();

  try {
    const [lockRows] = await connection.query<LockRow[]>(
      "SELECT GET_LOCK('farm_machine_specs_schema_migrations', 10) AS acquired",
    );

    if (Number(lockRows[0]?.acquired || 0) !== 1) {
      throw new Error('Could not acquire database migration lock.');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        description VARCHAR(500) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query<AppliedMigrationRow[]>(
      'SELECT id FROM schema_migrations',
    );
    const applied = new Set(appliedRows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;

      await connection.beginTransaction();
      try {
        await migration.apply(connection);
        await connection.query(
          'INSERT INTO schema_migrations (id, description) VALUES (?, ?)',
          [migration.id, migration.description],
        );
        await connection.commit();
        applied.add(migration.id);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK('farm_machine_specs_schema_migrations')");
    } finally {
      connection.release();
    }
  }
}

export async function ensureDatabaseMigrations() {
  if (!migrationPromise) {
    migrationPromise = applyMigrations().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }

  await migrationPromise;
}

export async function getDbReady() {
  await ensureDatabaseMigrations();
  return getDb();
}
