import { Router } from 'express';
import { CredentialRepository } from '../repositories/credential.repository';
import { IssueService } from '../services/issuance.service';
import { IssueController } from '../controllers/issuance.controller';
import { validateIssue } from '../validators/issue.validator';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const repo = new CredentialRepository();
const worker = process.env.POD_NAME || require('os').hostname() || 'worker-local';
const service = new IssueService(repo, worker);
const controller = new IssueController(service);

router.post('/', authMiddleware, validateIssue, (req, res, next) => controller.issue(req, res, next));

// Check endpoint used by external verification service to avoid direct DB access.
// Returns { issued: boolean, worker?: string, timestamp?: string }
router.post('/check', authMiddleware, validateIssue, async (req, res, next) => {
	try {
		const body = req.body || {};
		let id: string;
		if (body.credentialId && typeof body.credentialId === 'string') {
			id = body.credentialId;
		} else {
			id = require('../utils/jsonCanonical').idForPayload(body);
		}
		const existing = await repo.findById(id);
		if (!existing) return res.status(200).json({ issued: false });
		return res.status(200).json({ issued: true, worker: existing.issuedBy, timestamp: existing.issuedAt });
	} catch (err) {
		next(err);
	}
});

export default router;
