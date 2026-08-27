import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getDb() {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    throw new Error('Database environment variables are not configured.');
  }

  pool = mysql.createPool({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  return pool;
}
