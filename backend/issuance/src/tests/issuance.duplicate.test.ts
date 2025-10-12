import { runFixture, loadFixtureFromFile } from './fixtureRunner';

// Mock the db module to avoid Postgres connection requirement during tests
// Keep an in-memory map so insert/select behave consistently across requests
jest.mock('../db', () => {
  const store: Record<string, any> = {};
  return {
    initDb: async () => ({}),
    query: async (sql: string, params?: any[]) => {
      const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      // SELECT by id
      if (/SELECT .*FROM CREDENTIALS WHERE ID = \$1/.test(normalized)) {
        const id = params?.[0];
        if (id && store[id]) return { rows: [store[id]] };
        return { rows: [] };
      }
      // INSERT (handle variants like 'INSERT OR IGNORE' or 'INSERT ... ON CONFLICT') -> record payload
      if (/INSERT[\s\S]*INTO\s+CREDENTIALS/.test(normalized)) {
        // assume params: id, payload, issuedAt, issuedBy
        const id = params?.[0];
        const payload = params?.[1];
        const issuedAt = params?.[2];
        const issuedBy = params?.[3];
        if (id) {
          // if not exists, insert
          if (!store[id]) store[id] = { id, payload, issuedAt, issuedBy };
          return { rowCount: 1 };
        }
        return { rowCount: 0 };
      }
      return { rowCount: 0, rows: [] };
    }
  };
});

describe('fixture-driven duplicate /api/issue tests', () => {
  it('runs duplicate issuance fixtures (first then second)', async () => {
    const first = await loadFixtureFromFile('./fixtures/duplicate-first.json');
    const second = await loadFixtureFromFile('./fixtures/duplicate-second.json');

    // run first issuance
    await runFixture(first as any);

    // run duplicate issuance which should detect already issued
    await runFixture(second as any);
  });
});
