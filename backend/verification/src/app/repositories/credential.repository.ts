import { IssuedRecord } from '../models/credential.model';
import { initDb, query } from '../../db/index';

export class CredentialRepository {
  async findById(id: string): Promise<IssuedRecord | null> {
    const res = await query('SELECT id, payload, issuedAt, issuedBy FROM credentials WHERE id = $1', [id]);
    const row = res?.rows?.[0] || null;
    return row || null;
  }

  // Record a verification attempt in a local verifications table
  async insertVerification(record: { id: string; verifiedAt: string; verifiedBy: string; wasIssued: boolean; issuedBy?: string; issuedAt?: string }) {
    // ensure verifications table exists
    await query(`CREATE TABLE IF NOT EXISTS verifications (
      id TEXT,
      verifiedAt TEXT NOT NULL,
      verifiedBy TEXT NOT NULL,
      wasIssued BOOLEAN NOT NULL,
      issuedBy TEXT,
      issuedAt TEXT
    );`);

    if (process.env.DATABASE_URL) {
      await query('INSERT INTO verifications (id, verifiedAt, verifiedBy, wasIssued, issuedBy, issuedAt) VALUES ($1, $2, $3, $4, $5, $6)', [record.id, record.verifiedAt, record.verifiedBy, record.wasIssued, record.issuedBy || null, record.issuedAt || null]);
    } else {
      await query('INSERT INTO verifications (id, verifiedAt, verifiedBy, wasIssued, issuedBy, issuedAt) VALUES (?, ?, ?, ?, ?, ?)', [record.id, record.verifiedAt, record.verifiedBy, record.wasIssued ? 1 : 0, record.issuedBy || null, record.issuedAt || null]);
    }
  }
}
