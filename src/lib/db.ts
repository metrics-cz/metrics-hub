// lib/db.ts - Native PostgreSQL client for development
import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Native PostgreSQL client should only be used in development');
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, // Use only one connection to avoid conflicts
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  return pool;
}

export async function queryDb(text: string, params?: any[]) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}