import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { fileURLToPath } from 'node:url';
import { CLIENT_ORIGIN, NODE_ENV, PORT } from './config/config.js';
import { HttpStatus } from './config/constants.js';
import connectDB from './config/db.js';
import { notFoundHandler, serverErrorHandler } from './middleware/errorHandlers.js';
import cartRoutes from './routes/cartRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

const corsOptions = {
  origin: CLIENT_ORIGIN,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  optionsSuccessStatus: 204,
};

// Database Connection
connectDB();

// Middleware
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  '/uploads',
  express.static(fileURLToPath(new URL('./uploads/', import.meta.url)), {
    dotfiles: 'deny',
    index: false,
    maxAge: NODE_ENV === 'production' ? '7d' : 0,
  }),
);

// Health Check
app.get('/api/v1/health', (_request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Bulldogs Exchange API is healthy.',
    count: 1,
    data: { status: 'ok', environment: NODE_ENV },
  });
});

// API V1
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/carts', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/users', userRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(serverErrorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});
