import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { registerApp } from './app/index';

export function createApp() {
  const app = express();

  // Allow all origins. Use a permissive CORS policy in this environment.
  app.use(cors());
  // ensure preflight requests are handled
  app.options('*', cors());
  
  app.use(bodyParser.json({ limit: '1mb' }));
  registerApp(app);
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));
  // readiness endpoint checks DB
  app.get('/ready', async (_req, res) => {
    try {
      const db = await require('./db/index').initDb();
      res.status(200).json({ ready: true });
    } catch (err) {
      res.status(500).json({ ready: false });
    }
  });
  return app;
}

export default createApp;
