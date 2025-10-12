import { Request, Response, NextFunction } from 'express';
import { VerifyService } from '../services/verification.service';

export class VerifyController {
  private service: VerifyService;

  constructor(service: VerifyService) {
    this.service = service;
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      console.log('Verifying with payload:', payload);
      const result = await this.service.verify(payload);
      console.log('Verification result:', result);
      if (!result.valid) return res.status(200).json({ valid: false });
      const rec = result.record!;
      return res.status(200).json({
        valid: true,
        credentialId: rec.id,
        issuedBy: rec.issuedBy,
        issuedAt: rec.issuedAt,
        verifiedAt: new Date().toISOString(),
        verifiedBy: process.env.POD_NAME || require('os').hostname() || 'worker-local',
      });
    } catch (err) {
      next(err);
    }
  }
}
