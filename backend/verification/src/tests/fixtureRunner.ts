import request from 'supertest';

export type Fixture = {
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus: number;
  expectedBody?: any;
  normalize?: { remove?: string[]; wildcard?: string[] };
}

function replacePlaceholders(obj: any, fieldName: string, value: any): any {
  if (typeof obj === 'string') return obj.replace(new RegExp(`\\{${fieldName}\\}`, 'g'), value);
  if (Array.isArray(obj)) return obj.map(v => replacePlaceholders(v, fieldName, value));
  if (typeof obj === 'object' && obj !== null) Object.keys(obj).forEach(k => obj[k] = replacePlaceholders(obj[k], fieldName, value));
  return obj;
}

export async function runFixtureAgainstApp(appOrBase: any, fixture: Fixture) {
  const method = fixture.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  const isStringBase = typeof appOrBase === 'string';
  const req = request(appOrBase)[method](fixture.path);
  if (fixture.headers) Object.entries(fixture.headers).forEach(([k, v]) => req.set(k, v));
  const res = await (fixture.body ? req.send(fixture.body) : req);
  if (fixture.expectedStatus) expect(res.status).toBe(fixture.expectedStatus);
  if (fixture.expectedBody) {
    const actual = { ...res.body };
    if (fixture.normalize?.remove) fixture.normalize.remove.forEach(k => delete actual[k]);
    const expectedClone = JSON.parse(JSON.stringify(fixture.expectedBody));
    if (fixture.normalize?.wildcard) fixture.normalize.wildcard.forEach(k => {
      expect(actual).toHaveProperty(k);
      const val = actual[k];
      replacePlaceholders(expectedClone, k, val);
    });
    expect(actual).toEqual(expectedClone);
  }
  return res;
}

export async function loadFixture(p: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(p) as Fixture;
}
