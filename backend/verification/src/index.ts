import express from 'express';
import bodyParser from 'body-parser';
import verifyRoutes from './app/routes/verification.routes';
import { initDb } from './db/index';
import { errorHandler } from './app/middlewares/errorHandler.middleware';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

app.use('/api/verify', verifyRoutes);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', async (_req, res) => {
  try {
    await initDb();
    res.status(200).json({ ready: true });
  } catch (err) {
    res.status(500).json({ ready: false });
  }
});

app.use(errorHandler);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.listen(port, () => {
  console.log(`Verification service listening on port ${port}`);
});
