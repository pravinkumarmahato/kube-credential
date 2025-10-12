import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const CredentialSchema = z.object({}).catchall(z.any());

export function validateIssue(req: Request, res: Response, next: NextFunction) {
  const parse = CredentialSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'invalid payload', details: parse.error.errors });
  next();
}
