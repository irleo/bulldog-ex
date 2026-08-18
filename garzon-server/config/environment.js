import 'dotenv/config';

/** @typedef {'development' | 'test' | 'production'} NodeEnvironment */

const parsePort = (value) => {
  const port = Number.parseInt(value ?? '5000', 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

export const environment = Object.freeze({
  /** @type {NodeEnvironment} */
  nodeEnv,
  port: parsePort(process.env.PORT),
  mongoUri:
    process.env.MONGODB_URI ??
    process.env.MONGO_URI ??
    'mongodb://127.0.0.1:27017/bulldogs_exchange',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
});
