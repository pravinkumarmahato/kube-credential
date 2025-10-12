import { IssuedRecord } from '../models/credential.model';
import { initDb, query } from '../../db/index';

export class CredentialRepository {
  async findById(id: string): Promise<IssuedRecord | null> {
    const res = await query('SELECT id, payload, issuedAt, issuedBy FROM credentials WHERE id = $1', [id]);
    // pg returns rows; sqlite wrapper returns rows array with single item
    const row = res?.rows?.[0] || null;
    if (!row) return null;
    // Normalize DB returned column names (postgres returns lowercase column names)
    return {
      id: row.id,
      payload: row.payload,
      issuedAt: row.issuedAt || row.issuedat || null,
      issuedBy: row.issuedBy || row.issuedby || null,
    };
  }

  async findByPayload(payload: string): Promise<IssuedRecord | null> {
    const res = await query('SELECT id, payload, issuedAt, issuedBy FROM credentials WHERE payload = $1', [payload]);
    const row = res?.rows?.[0] || null;
    if (!row) return null;
    return {
      id: row.id,
      payload: row.payload,
      issuedAt: row.issuedAt || row.issuedat || null,
      issuedBy: row.issuedBy || row.issuedby || null,
    };
  }

  async insert(record: IssuedRecord): Promise<IssuedRecord | null> {
    // For Postgres use ON CONFLICT DO NOTHING; for sqlite use INSERT OR IGNORE
    if (process.env.DATABASE_URL) {
      await query('INSERT INTO credentials (id, payload, issuedAt, issuedBy) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [record.id, record.payload, record.issuedAt, record.issuedBy]);
    } else {
      await query('INSERT OR IGNORE INTO credentials (id, payload, issuedAt, issuedBy) VALUES (?, ?, ?, ?)', [record.id, record.payload, record.issuedAt, record.issuedBy]);
    }
    // return canonical DB row (normalize column names to camelCase)
    const res = await query('SELECT id, payload, issuedAt, issuedBy FROM credentials WHERE id = $1', [record.id]);
    const row = res?.rows?.[0] || null;
    if (!row) return null;
    return {
      id: row.id,
      payload: row.payload,
      issuedAt: row.issuedAt || row.issuedat || null,
      issuedBy: row.issuedBy || row.issuedby || null,
    };
  }
}
