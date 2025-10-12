import { issueCredential, verifyCredential } from '../api/client';

describe('API client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('issueCredential - success', async () => {
    const mockResponse = { message: 'credential issued by worker-1', credentialId: 'abc123', issuedBy: 'worker-1', issuedAt: '2025-10-08T00:00:00Z' };
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any;
    const res = await issueCredential({ name: 'Test' });
    expect(res).toEqual(mockResponse);
  });

  it('issueCredential - failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, text: () => Promise.resolve('bad request') })) as any;
    await expect(issueCredential({})).rejects.toThrow(/bad request/);
  });

  it('verifyCredential - success', async () => {
    const mockResponse = { valid: true, credentialId: 'abc123', issuedBy: 'worker-1', issuedAt: '2025-10-08T00:00:00Z', verifiedAt: '2025-10-08T00:00:10Z', verifiedBy: 'worker-2' };
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })) as any;
    const res = await verifyCredential({ name: 'Test' });
    expect(res).toEqual(mockResponse);
  });

  it('verifyCredential - failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, text: () => Promise.resolve('verify failed') })) as any;
    await expect(verifyCredential({})).rejects.toThrow(/verify failed/);
  });
});
