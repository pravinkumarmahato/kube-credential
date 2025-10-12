import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { registerApp } from './app/index';

export function createApp() {
  const app = express();

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:5173'];
    
    app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true, // if you use cookies
    }));
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
