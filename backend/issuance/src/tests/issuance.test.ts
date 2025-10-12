import { runFixture, loadFixtureFromFile } from './fixtureRunner';

// Mock the db module to avoid any Postgres or file I/O during tests
jest.mock('./../db', () => ({
  initDb: async () => ({}),
  query: async (sql: string, params?: any[]) => {
    // naive in-test stub: implement the minimal behavior used by repository
    if (/SELECT .* FROM credentials WHERE id = \$1/i.test(sql)) {
      return { rows: [] };
    }
    return { rowCount: 1 };
  }
}));

describe('fixture-driven /api/issue', () => {
  it('runs the issuance fixture', async () => {
    const fixture = await loadFixtureFromFile('./fixtures/issuance.json');
    await runFixture(fixture as any);
  });
});

