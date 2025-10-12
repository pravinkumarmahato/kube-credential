import createApp from './app';
import { initDb } from './db';

async function start() {
  // ensure DB schema exists before accepting requests
  await initDb();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`Verification service listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start verification service', err);
  process.exit(1);
});
