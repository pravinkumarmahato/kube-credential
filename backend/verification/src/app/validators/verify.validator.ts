import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Accept either a plain credentialId or a credential payload (flexible)
const CredentialIdSchema = z.object({ credentialId: z.string().min(1) });
const CredentialSchema = z.object({}).catchall(z.any());
const VerifySchema = z.union([CredentialIdSchema, CredentialSchema]);

export function verifyValidator(req: Request, res: Response, next: NextFunction) {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload', details: parsed.error.errors });
  next();
}
