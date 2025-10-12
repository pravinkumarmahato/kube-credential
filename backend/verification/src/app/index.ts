import { Router } from 'express';
import verifyRoutes from './routes/verification.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { requestId } from './middlewares/requestId.middleware';

export function registerApp(app: any) {
  app.use(requestId);
  app.use('/api/verify', verifyRoutes);
  app.use(errorHandler);
}
