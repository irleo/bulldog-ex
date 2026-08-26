import 'dotenv/config';

const parsePort = (value) => {
  const port = Number.parseInt(value ?? '5000', 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
};

const NODE_ENV = process.env.NODE_ENV ?? 'development';

if (!['development', 'test', 'production'].includes(NODE_ENV)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

const MONGO_URI =
  process.env.MONGO_URI ??
  process.env.MONGODB_URI ??
  'mongodb://127.0.0.1:27017/bulldogs_exchange';
const PORT = parsePort(process.env.PORT);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export { CLIENT_ORIGIN, MONGO_URI, NODE_ENV, PORT };
