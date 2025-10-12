import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = process.env.API_KEY;
  // In non-production environments we allow requests through for local testing
  if (!key && process.env.NODE_ENV !== 'production') return next();
  if (!key) return res.status(500).json({ error: 'server misconfigured: API_KEY missing' });
  const supplied = req.header('x-api-key');
  if (supplied && supplied === key) return next();
  return res.status(401).json({ error: 'unauthorized' });
}
