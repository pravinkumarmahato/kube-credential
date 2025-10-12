import { runFixtureAgainstApp, loadFixture } from './fixtureRunner';

describe('fixture-driven verification', () => {
  it('issues via issuance and verifies via verification using fixtures', async () => {
    // ensure no cached modules (so our mocks apply)
    jest.resetModules();

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

    // mock verification db so the verification app doesn't require DATABASE_URL
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

    // require app factories
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createIssuanceApp = require('../../../issuance/src/app').createApp || require('../../../issuance/src/app').default || require('../../../issuance/src/app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createVerificationApp = require('../app').createApp || require('../app').default || require('../app');

    const issuanceApp = typeof createIssuanceApp === 'function' ? createIssuanceApp() : createIssuanceApp;
    const srv = issuanceApp.listen(0);
    const base = `http://127.0.0.1:${(srv.address() as any).port}`;
    process.env.ISSUANCE_SERVICE_URL = base;

    const verificationApp = typeof createVerificationApp === 'function' ? createVerificationApp() : createVerificationApp;

    const issueFixture = await loadFixture('../tests/fixtures/verify-issue.json');
    const verifyFixture = await loadFixture('../tests/fixtures/verify-verify.json');

    // run issuance over HTTP
    const issueRes = await runFixtureAgainstApp(base, issueFixture as any);
    const credentialId = issueRes.body.credentialId;

    // run verification
    // replace placeholders in verify fixture as runFixtureAgainstApp does not mutate the fixture
    verifyFixture.expectedBody = JSON.parse(JSON.stringify(verifyFixture.expectedBody));
    verifyFixture.expectedBody.credentialId = '{credentialId}';

    // call verification app
    const verifyRes = await runFixtureAgainstApp(verificationApp, verifyFixture as any);
    expect(verifyRes.body).toHaveProperty('credentialId', credentialId);

    srv.close();
  });
});
