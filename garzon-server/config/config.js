// @ts-check
import "dotenv/config";

/** @param {string | undefined} value */
const parsePort = (value) => {
  const port = Number.parseInt(value ?? "5000", 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
};

const NODE_ENV = process.env.NODE_ENV ?? "development";

if (!["development", "test", "production"].includes(NODE_ENV)) {
  throw new Error("NODE_ENV must be development, test, or production.");
}

const MONGO_URI =
  process.env.MONGO_URI ??
  process.env.MONGODB_URI ??
  "mongodb://127.0.0.1:27017/bulldogs_exchange";
const PORT = parsePort(process.env.PORT);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET ?? "development-only-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();

// Accept explicit production/preview origins; never allow arbitrary preview hosts.
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);
if (NODE_ENV === 'production') {
  if (!process.env.MONGO_URI?.trim() && !process.env.MONGODB_URI?.trim()) {
    throw new Error('MONGO_URI must be configured in production.');
  }
  if (!process.env.CLIENT_ORIGIN?.trim() || !CLIENT_ORIGINS.length) {
    throw new Error('CLIENT_ORIGIN must be configured in production.');
  }
  for (const origin of CLIENT_ORIGINS) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.origin !== origin || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) {
      throw new Error('CLIENT_ORIGIN must contain exact HTTPS origins separated by commas, without trailing slashes.');
    }
  }
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials must be configured in production.');
  }
}

if (NODE_ENV === "production" && (JWT_SECRET.length < 32 || /development|change.?me|example|password/i.test(JWT_SECRET))) {
  throw new Error("JWT_SECRET must be configured in production.");
}

export { CLIENT_ORIGIN, CLIENT_ORIGINS, JWT_EXPIRES_IN, JWT_SECRET, MONGO_URI, NODE_ENV, PORT };
export { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET };

// Exact proxy addresses/subnets only; never trust arbitrary forwarded client addresses.
const TRUST_PROXY = process.env.TRUST_PROXY?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
export { TRUST_PROXY };
