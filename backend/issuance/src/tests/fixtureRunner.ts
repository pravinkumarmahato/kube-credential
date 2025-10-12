import request from 'supertest';
import createApp from './../app';

type Fixture = {
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedBody?: any;
  normalize?: {
    remove?: string[];   // list of top-level fields to remove before compare
    wildcard?: string[]; // list of fields expected but not compared
  }
}

/**
 * Recursively replaces placeholders like {fieldName} in obj with value.
 */
function replacePlaceholders(obj: any, fieldName: string, value: any): any {
  if (typeof obj === 'string') {
    return obj.replace(new RegExp(`\\{${fieldName}\\}`, 'g'), value);
  }
  if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach(key => {
      obj[key] = replacePlaceholders(obj[key], fieldName, value);
    });
  }
  return obj;
}

export async function runFixture(fixture: Fixture) {
  const app = createApp();

  // Type-safe method handling
  const method = fixture.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const req = request(app)[method](fixture.path);

  if (fixture.headers) {
    Object.entries(fixture.headers).forEach(([k, v]) => req.set(k, v));
  }

  const res = await (fixture.body ? req.send(fixture.body) : req);

  // Status check
  if (fixture.expectedStatus) {
    expect(res.status).toBe(fixture.expectedStatus);
  }

  // Response body check
  if (fixture.expectedBody) {
    const actual = { ...res.body };

    // Remove fields that are dynamic and should be ignored
    if (fixture.normalize?.remove) {
      fixture.normalize.remove.forEach(k => delete actual[k]);
    }

    // Clone expectedBody for placeholder replacement
    const expectedWithPlaceholders = JSON.parse(JSON.stringify(fixture.expectedBody));

    // Handle wildcard fields
    if (fixture.normalize?.wildcard) {
      fixture.normalize.wildcard.forEach(k => {
        expect(actual).toHaveProperty(k);       // Ensure field exists
        const value = actual[k];                // Get actual value
        replacePlaceholders(expectedWithPlaceholders, k, value); // Replace placeholder in expected
      });
    }

    // Deep equality check
    expect(actual).toEqual(expectedWithPlaceholders);
  }
}

/**
 * Loads a fixture JSON file from disk (relative to tests/fixtures folder)
 */
export async function loadFixtureFromFile(path: string) {
  // Use require so it works with Jest
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const f = require(path);
  return f as Fixture;
}

/**
 * Run an integration-style issue -> verify fixture pair using in-process apps.
 * This sets up shared in-memory DB mocks for both services and a fetch shim
 * that forwards verification checks to the in-process issuance app.
 */
export async function runIssueVerifyFixture(issueFixture: Fixture, verifyFixture: Fixture) {
  // ensure test environment so in-memory shim is used when available
  process.env.NODE_ENV = 'test';

  // shared in-memory store used by both services
  const sharedStore: Record<string, any> = {};

  // mock issuance DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).jest?.mock?.('../db', () => ({
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

  // mock verification DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).jest?.mock?.('../../../verification/src/db', () => ({
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

  // require app factories after mocking
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createIssuanceApp = require('../app').default || require('../app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const createVerificationApp = require('../../../verification/src/app').default || require('../../../verification/src/app');

  const issuanceApp = createIssuanceApp();
  const verificationApp = createVerificationApp();

  // setup fetch shim to forward /api/check to issuance app
  (globalThis as any).fetch = async (url: string, opts: any) => {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      if (path === '/api/check' || path === '/api/issue/check') {
        const res = await request(issuanceApp)
          .post('/api/issue/check')
          .send(JSON.parse(opts.body))
          .set(opts.headers || {});
        return {
          ok: res.status >= 200 && res.status < 300,
          status: res.status,
          json: async () => res.body,
          text: async () => JSON.stringify(res.body),
        };
      }
    } catch (e) {
      // fall through
    }
    throw new Error('fetch shim only supports /api/check in tests');
  };

  // Issue
  const method = issueFixture.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const req = request(issuanceApp)[method](issueFixture.path);
  if (issueFixture.headers) Object.entries(issueFixture.headers).forEach(([k, v]) => req.set(k, v));
  const issueRes = await (issueFixture.body ? req.send(issueFixture.body) : req);
  // allow created or ok
  expect([200, 201]).toContain(issueRes.status);
  const credentialId = issueRes.body.credentialId;
  const issuedBy = issueRes.body.issuedBy;

  // prepare verify expected
  const verifyWithValues = JSON.parse(JSON.stringify(verifyFixture));
  const placeholders: Record<string, any> = { credentialId, issuedBy, verifiedBy: verifyWithValues.expectedBody?.verifiedBy || issuedBy };
  function replaceRec(obj: any): any {
    if (typeof obj === 'string') return obj.replace(/\{(credentialId|issuedBy|verifiedBy)\}/g, (_, k) => placeholders[k]);
    if (Array.isArray(obj)) return obj.map(replaceRec);
    if (typeof obj === 'object' && obj !== null) Object.keys(obj).forEach(k => obj[k] = replaceRec(obj[k]));
    return obj;
  }
  replaceRec(verifyWithValues.expectedBody);

  // Verify
  const vmethod = verifyFixture.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const vreq = request(verificationApp)[vmethod](verifyFixture.path);
  if (verifyFixture.headers) Object.entries(verifyFixture.headers).forEach(([k, v]) => vreq.set(k, v));
  const verifyRes = await (verifyFixture.body ? vreq.send(verifyFixture.body) : vreq);
  expect(verifyRes.status).toBe(verifyFixture.expectedStatus);

  const actual = { ...verifyRes.body };
  if (verifyFixture.normalize?.remove) verifyFixture.normalize.remove.forEach(k => delete actual[k]);
  if (verifyFixture.normalize?.wildcard) {
    verifyFixture.normalize.wildcard.forEach((k: string) => {
      expect(actual).toHaveProperty(k);
      const val = actual[k];
      const expStr = JSON.stringify(verifyWithValues.expectedBody);
      const replaced = expStr.replace(new RegExp(`\\{${k}\\}`, 'g'), val);
      verifyWithValues.expectedBody = JSON.parse(replaced);
    });
  }
  expect(actual).toEqual(verifyWithValues.expectedBody);
}
