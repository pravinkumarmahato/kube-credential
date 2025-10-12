import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error('Unhandled error:', err?.message || err);
  res.status(err?.statusCode || 500).json({ error: 'Internal Server Error', message: err?.message || String(err)});
}
