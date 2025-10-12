import request from 'supertest';

// Ensure no cached modules so our mocks take effect
jest.resetModules();

// mock issuance DB so the in-process issuance app doesn't require Postgres
jest.mock('../../../issuance/src/db', () => {
  const store: Record<string, any> = {};
  return {
    initDb: async () => ({}),
    query: async (sql: string, params?: any[]) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      if (/SELECT .*FROM CREDENTIALS WHERE ID = \$1/.test(normalized)) {
        const id = params?.[0];
        return { rows: id && store[id] ? [store[id]] : [] };
      }
      if (/INSERT[\s\S]*INTO\s+CREDENTIALS/.test(normalized)) {
        const id = params?.[0];
        const payload = params?.[1];
        const issuedAt = params?.[2];
        const issuedBy = params?.[3];
        if (id && !store[id]) store[id] = { id, payload, issuedAt, issuedBy };
        return { rowCount: 1 };
      }
      return { rowCount: 0, rows: [] };
    }
  };
});

// mock verification DB so verification app doesn't require Postgres
jest.mock('../db', () => {
  const store: Record<string, any> = {};
  return {
    initDb: async () => ({}),
    query: async (sql: string, params?: any[]) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      if (/SELECT .*FROM CREDENTIALS WHERE ID = \$1/.test(normalized)) {
        const id = params?.[0];
        return { rows: id && store[id] ? [store[id]] : [] };
      }
      if (/INSERT[\s\S]*INTO\s+CREDENTIALS/.test(normalized)) {
        const id = params?.[0];
        const payload = params?.[1];
        const issuedAt = params?.[2];
        const issuedBy = params?.[3];
        if (id && !store[id]) store[id] = { id, payload, issuedAt, issuedBy };
        return { rowCount: 1 };
      }
      return { rowCount: 0, rows: [] };
    }
  };
});

describe('issue -> verify full flow', () => {
  it('issues a credential via issuance and verification returns valid:true using credentialId', async () => {
    // require app factories after mocks
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createIssuanceApp = require('../../../issuance/src/app').createApp || require('../../../issuance/src/app').default || require('../../../issuance/src/app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createVerificationApp = require('../app').createApp || require('../app').default || require('../app');

    const issuanceApp = typeof createIssuanceApp === 'function' ? createIssuanceApp() : createIssuanceApp;
    const srv = issuanceApp.listen(0);
    const base = `http://127.0.0.1:${(srv.address() as any).port}`;
    process.env.ISSUANCE_SERVICE_URL = base;

    const verificationApp = typeof createVerificationApp === 'function' ? createVerificationApp() : createVerificationApp;

    const payload = { name: 'Integration Alice', email: 'integration-alice@example.com' };

    const issueRes = await request(base).post('/api/issue').send(payload).set('Accept', 'application/json');
    expect([200, 201]).toContain(issueRes.status);
    expect(issueRes.body).toHaveProperty('credentialId');
    const credentialId = issueRes.body.credentialId;

    // call verification with only credentialId
    const verifyRes = await request(verificationApp).post('/api/verify').send({ "credentialId": credentialId }).set('Accept', 'application/json');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('valid', true);
    expect(verifyRes.body).toHaveProperty('credentialId', credentialId);

    srv.close();
  });
});
