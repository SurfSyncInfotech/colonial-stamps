import { initDatabase } from './pool.js';

try {
  await initDatabase();
  console.log('Database is ready at backend/data/folio.sqlite');
  process.exit(0);
} catch (error) {
  console.error('Database setup failed.');
  console.error(error);
  process.exit(1);
}
