import { Pool } from 'pg';

let pgPool: Pool | null = null;

export async function initDb() {
  // If a DATABASE_URL isn't provided directly, but the standard
  // POSTGRES_* env vars are set (injected from a Secret), construct
  // a DATABASE_URL so the rest of the code can rely on it.
  if (!process.env.DATABASE_URL) {
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const db = process.env.POSTGRES_DB;
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = process.env.POSTGRES_PORT || '5432';
    if (user && password && db) {
      process.env.DATABASE_URL = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(db)}`;
    }
  }

  if (process.env.DATABASE_URL) {
    if (pgPool) return pgPool;
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS credentials (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          issuedAt TEXT NOT NULL,
          issuedBy TEXT NOT NULL
        );
      `);
    } catch (err) {
      console.error('Failed to ensure Postgres schema', err);
      throw err;
    }
    return pgPool;
  }
  // If we reach here, no DATABASE_URL was provided. Tests should mock
  // the db module (initDb/query) to avoid needing a real database.
  throw new Error('DATABASE_URL not configured. Tests must mock db module or provide DATABASE_URL pointing to Postgres.');
}

export async function query(text: string, params?: any[]) {
  if (pgPool) return pgPool.query(text, params);
  const db: any = await initDb();
  if (/^SELECT/i.test(text)) {
    const stmt = db.prepare(text);
    const rows = stmt.all(...(params || []));
    return { rows };
  }
  const stmt = db.prepare(text);
  const res = stmt.run(...(params || []));
  return { rowCount: res?.changes || 0 };
}

export function isPg() {
  return !!pgPool;
}
