import request from 'supertest';
import { runFixture, loadFixtureFromFile } from './fixtureRunner';

// Provide an in-memory DB mock for this test file only
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

describe('POST /api/issue/check', () => {
  it('returns issued:false when not present, then true after issuance', async () => {
    // use fixtures
    const issueFixture = await loadFixtureFromFile('./fixtures/check-issue.json');
    const checkFixture = await loadFixtureFromFile('./fixtures/check-verify.json');

    // Run check before issuance (expect issued:false)
    const app = (require('../app').default || require('../app'))();
    const beforeRes = await request(app).post(checkFixture.path).send(checkFixture.body).set(checkFixture.headers || {});
    expect(beforeRes.status).toBe(200);
    expect(beforeRes.body).toHaveProperty('issued', false);

    // Run issuance via runFixture to validate response according to fixture
    await runFixture(issueFixture as any);

    // Run check again and validate expected shape
    const afterRes = await request(app).post(checkFixture.path).send(checkFixture.body).set(checkFixture.headers || {});
    expect(afterRes.status).toBe(checkFixture.expectedStatus);
    expect(afterRes.body).toHaveProperty('issued', true);
    expect(afterRes.body).toHaveProperty('worker');
    expect(afterRes.body).toHaveProperty('timestamp');
  });
});
