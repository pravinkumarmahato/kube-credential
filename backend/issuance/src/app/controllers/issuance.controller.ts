import { Request, Response, NextFunction } from 'express';
import { IssueService } from '../services/issuance.service';
import { CredentialPayload } from '../models/credential.model';

export class IssueController {
  private service: IssueService;

  constructor(service: IssueService) {
    this.service = service;
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body as CredentialPayload;
      console.log('Issuing credential with payload:', payload);
      const result = await this.service.issue(payload);
      console.log('Issue result:', result);
      const rec = result.record!;
      if (result.status === 'created') {
        return res.status(201).json({
          message: `credential issued by ${rec.issuedBy}`,
          credentialId: rec.id,
          issuedBy: rec.issuedBy,
          issuedAt: rec.issuedAt,
        });
      }
      return res.status(200).json({
        message: `credential already issued by ${rec.issuedBy}`,
        credentialId: rec.id,
        issuedBy: rec.issuedBy,
        issuedAt: rec.issuedAt,
      });
    } catch (err) {
      next(err);
    }
  }
}
