import { CredentialPayload, IssuedRecord } from '../models/credential.model';
import { CredentialRepository } from '../repositories/credential.repository';
import { idForPayload } from '../utils/jsonCanonical';

export class IssueService {
  private repo: CredentialRepository;
  private workerId: string;

  constructor(repo: CredentialRepository, workerId: string) {
    this.repo = repo;
    this.workerId = workerId;
  }

  async issue(payload: CredentialPayload): Promise<{ status: 'created' | 'exists'; record: IssuedRecord }> {
    const id = idForPayload(payload);
    const existing = await this.repo.findByPayload(payload as unknown as string);
    if (existing) return { status: 'exists', record: existing };

    const now = new Date().toISOString();
    const rec: IssuedRecord = { id, payload: JSON.stringify(payload), issuedAt: now, issuedBy: this.workerId };
    const dbRow = await this.repo.insert(rec);
    return { status: 'created', record: dbRow || rec };
  }
}
