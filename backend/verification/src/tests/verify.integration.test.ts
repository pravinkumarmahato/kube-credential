import request from 'supertest';

// mock verification db so verification app doesn't require DATABASE_URL
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

describe('issue then verify integration (HTTP check)', () => {
  it('issues a credential then verifies it via issuance /api/check', async () => {
    // mock issuance db so the in-process issuance app doesn't require DATABASE_URL
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

    // require app factories from the other packages
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createIssuanceApp = require('../../../issuance/src/app').createApp || require('../../../issuance/src/app').default || require('../../../issuance/src/app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createVerificationApp = require('../app').createApp || require('../app').default || require('../app');

    const issuanceApp = typeof createIssuanceApp === 'function' ? createIssuanceApp() : createIssuanceApp;
    // start issuance on an ephemeral port so verification can call it over HTTP
    const srv = issuanceApp.listen(0);
    const address = srv.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const base = `http://127.0.0.1:${port}`;

    // instruct verification to call the running issuance service
    process.env.ISSUANCE_SERVICE_URL = base;

    const verificationApp = typeof createVerificationApp === 'function' ? createVerificationApp() : createVerificationApp;

    const payload = { name: 'Bob', email: 'bob@example.com' };

    // issue via issuance HTTP server
    const issueRes = await request(base).post('/api/issue').send(payload).set('Accept', 'application/json');
    expect([200, 201]).toContain(issueRes.status);
    expect(issueRes.body).toHaveProperty('credentialId');
    const credentialId = issueRes.body.credentialId;
    expect(issueRes.body).toHaveProperty('issuedBy');

    // now call verification which will POST to issuance /api/check
    const verifyRes = await request(verificationApp).post('/api/verify').send({ "credentialId": credentialId }).set('Accept', 'application/json');
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body).toHaveProperty('valid');
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body).toHaveProperty('credentialId', credentialId);
    expect(verifyRes.body).toHaveProperty('verifiedBy');
    expect(verifyRes.body).toHaveProperty('verifiedAt');

    srv.close();
  });
});

