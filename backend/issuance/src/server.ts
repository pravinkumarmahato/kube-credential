import { createApp } from './app';
import { initDb } from './db';

async function start() {
  // ensure DB schema exists before accepting requests
  await initDb();
  const app = createApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, () => {
    console.log(`Issuance service listening on port ${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start issuance service', err);
  process.exit(1);
});
