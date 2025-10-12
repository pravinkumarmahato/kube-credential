import request from 'supertest';
import { runFixture, loadFixtureFromFile, runIssueVerifyFixture } from './fixtureRunner';
// createIssuanceApp and createVerificationApp will be imported after setting NODE_ENV in the test body
let createIssuanceApp: any;
let createVerificationApp: any;

// Provide a shared in-memory DB mock used by both services in this integration test.
const sharedStore: Record<string, any> = {};
jest.mock('../db', () => ({
  initDb: async () => ({}),
  query: async (sql: string, params?: any[]) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (/SELECT .*FROM CREDENTIALS WHERE ID = \$1/.test(normalized)) {
      const id = params?.[0];
      return { rows: id && sharedStore[id] ? [sharedStore[id]] : [] };
    }
    if (/INSERT[\s\S]*INTO\s+CREDENTIALS/.test(normalized)) {
      const id = params?.[0];
      const payload = params?.[1];
      const issuedAt = params?.[2];
      const issuedBy = params?.[3];
      if (id && !sharedStore[id]) sharedStore[id] = { id, payload, issuedAt, issuedBy };
      return { rowCount: 1 };
    }
    return { rowCount: 0, rows: [] };
  }
}));

jest.mock('../../../verification/src/db', () => ({
  initDb: async () => ({}),
  query: async (sql: string, params?: any[]) => {
    const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
    if (/SELECT .*FROM CREDENTIALS WHERE ID = \$1/.test(normalized)) {
      const id = params?.[0];
      return { rows: id && sharedStore[id] ? [sharedStore[id]] : [] };
    }
    if (/INSERT[\s\S]*INTO\s+CREDENTIALS/.test(normalized)) {
      const id = params?.[0];
      const payload = params?.[1];
      const issuedAt = params?.[2];
      const issuedBy = params?.[3];
      if (id && !sharedStore[id]) sharedStore[id] = { id, payload, issuedAt, issuedBy };
      return { rowCount: 1 };
    }
    return { rowCount: 0, rows: [] };
  }
}));

describe('fixture-driven Integration - issue then verify', () => {
  it('issues a credential then verifies it using fixtures', async () => {
    const issueFixture = await loadFixtureFromFile('./fixtures/integration-issue.json');
    const verifyFixture = await loadFixtureFromFile('./fixtures/integration-verify.json');
    await runIssueVerifyFixture(issueFixture as any, verifyFixture as any);
  });
});
