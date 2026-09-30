import { createApp } from './app.js';
import { config } from './config.js';
import { initDatabase } from './db/pool.js';
import { logger } from './lib.js';

const app = createApp();

async function start() {
  try {
    await initDatabase();
  } catch (error) {
    logger('error', 'Database setup failed', { message: error.message });
    console.error(error);
    process.exit(1);
  }
  app.listen(config.port, () => {
    logger('info', `Stamps API listening on http://localhost:${config.port}`);
  });
}

start();
