import app from './app.js';
import { PORT } from './config/config.js';
import connectDB from './config/db.js';

try {
  await connectDB();
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}.`));
  server.on('error', (error) => {
    console.error('HTTP server failed:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('Server startup failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}
