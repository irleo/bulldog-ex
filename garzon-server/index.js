import app from './app.js';
import { PORT } from './config/config.js';
import connectDB from './config/db.js';
import mongoose from 'mongoose';

try {
  await connectDB();
  // Enforce unique keys and expiry indexes before accepting requests.
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}.`));
  server.on('error', (error) => {
    console.error('HTTP server failed:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('Server startup failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}
