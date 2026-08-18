import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { HttpStatus } from './config/constants.js';
import { environment } from './config/environment.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import cartRoutes from './routes/cartRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
let server;

app.disable('x-powered-by');
app.use(
  cors({
    origin: environment.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(environment.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/api/v1/health', (_request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Bulldogs Exchange API is healthy.',
    count: 1,
    data: { status: 'ok', environment: environment.nodeEnv },
  });
});

// API v1
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase(environment.mongoUri);
    console.log('MongoDB connection established.');

    server = app.listen(environment.port, () => {
      console.log(`Bulldogs Exchange API listening on port ${environment.port}.`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Closing the API safely.`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void startServer();
