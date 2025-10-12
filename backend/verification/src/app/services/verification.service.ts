import { CredentialPayload, IssuedRecord } from '../models/credential.model';
import { CredentialRepository } from '../repositories/credential.repository';
import { idForPayload } from '../utils/jsonCanonical';

export class VerifyService {
  private repo: CredentialRepository;

  constructor(repo: CredentialRepository) {
    this.repo = repo;
  }

  async verify(payload: CredentialPayload): Promise<{ valid: boolean; record?: IssuedRecord }> {
    // allow clients to pass either { credentialId } or the original credential payload
    let id: string;
    if ((payload as any).credentialId && typeof (payload as any).credentialId === 'string') {
      id = (payload as any).credentialId;
    } else {
      id = idForPayload(payload);
    }

    // Call Issuance service /api/check to preserve microservice isolation
    const issuanceUrl = process.env.ISSUANCE_SERVICE_URL || 'http://localhost:3000';
    const checkUrl = issuanceUrl.replace(/\/$/, '') + '/api/issue/check';
    let wasIssued = false;
    let issuedRec: any = undefined;
    try {
      // load fetch implementation dynamically to avoid requiring node-fetch in all environments
      let _fetch: any = (globalThis as any).fetch;
      try {
        if (!_fetch) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          _fetch = require('node-fetch');
        }
      } catch (e) {
        // node-fetch not installed; rely on global fetch if present
      }
      // For check, pass credentialId when available to let issuance perform lookup by id
      const checkBody = ((payload as any).credentialId && typeof (payload as any).credentialId === 'string') ? { credentialId: id } : payload;
      const headers: any = { 'Content-Type': 'application/json' };
      // forward issuance api key if configured so verification can call issuance/check
      if (process.env.ISSUANCE_API_KEY) headers['x-api-key'] = process.env.ISSUANCE_API_KEY;
      const res = await _fetch(checkUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(checkBody),
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.issued) {
          wasIssued = true;
          issuedRec = { id, issuedBy: json.worker, issuedAt: json.timestamp };
        }
      }
    } catch (err) {
      // network or other error — treat as not issued but record attempt
      wasIssued = false;
    }

    const verificationRow = {
      id,
      verifiedAt: new Date().toISOString(),
      verifiedBy: process.env.POD_NAME || require('os').hostname() || 'worker-local',
      wasIssued,
      issuedBy: issuedRec?.issuedBy,
      issuedAt: issuedRec?.issuedAt,
    };

    await this.repo.insertVerification(verificationRow as any);

    if (!wasIssued) return { valid: false };
    // Return the issued record shape to controller
    const rec: IssuedRecord = { id, payload: JSON.stringify(payload), issuedAt: issuedRec.issuedAt, issuedBy: issuedRec.issuedBy };
    return { valid: true, record: rec };
  }
}
