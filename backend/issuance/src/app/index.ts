import { Router } from 'express';
import issuanceRoutes from './routes/issuance.routes';
import { requestId } from './middlewares/requestId.middleware';
import { errorHandler } from './middlewares/errorHandler.middleware';

export function registerApp(app: any) {
  app.use(requestId);
  app.use('/api/issue', issuanceRoutes);
  app.use(errorHandler);
}
