import { Router } from 'express';
import { CredentialRepository } from '../repositories/credential.repository';
import { VerifyService } from '../services/verification.service';
import { VerifyController } from '../controllers/verification.controller';
import { verifyValidator } from '../validators/verify.validator';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

const repo = new CredentialRepository();
const service = new VerifyService(repo);
const controller = new VerifyController(service);

router.post('/', authMiddleware, verifyValidator, (req, res, next) => controller.verify(req, res, next));

export default router;
