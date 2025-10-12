import crypto from 'crypto';

export function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export function idForPayload(payload: any): string {
  const canon = canonicalize(payload);
  return crypto.createHash('sha256').update(canon).digest('hex');
}
