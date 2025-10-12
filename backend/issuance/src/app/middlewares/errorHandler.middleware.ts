import { Request, Response, NextFunction } from 'express';

export function errorHandler(_err: any, _req: Request, res: Response, _next: NextFunction) {
  // Note: keep minimal for assignment; replace with pino/winston in production
  console.error('Unhandled error:', _err?.message || _err);
  res.status(_err?.statusCode || 500).json({ error: _err?.message || 'internal error' });
}
