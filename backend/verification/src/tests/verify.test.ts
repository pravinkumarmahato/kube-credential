import request from 'supertest';

// mock verification db to avoid requiring a real DATABASE_URL during tests
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

import createApp from '../app';

const app = createApp();

describe('POST /api/verify', () => {
  it('returns valid false for missing credential', async () => {
    const payload = { name: 'NonExist', email: 'noone@example.com' };
    const res = await request(app).post('/api/verify').send(payload).set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('valid');
  });
});

describe('POST /api/verify', () => {
  it('validates credential', async () => {
    const payload = { credentialId: 'sdfjsdfkjdfngauenvjasndv' };
    const res = await request(app).post('/api/verify').send(payload).set('Accept', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('valid');
  });
});
