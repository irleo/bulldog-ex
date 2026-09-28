import jwt from 'jsonwebtoken';
import { createHash, randomUUID } from 'node:crypto';
import Session from '../models/sessionModel.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/config.js';

/** @param {{ _id: import('mongoose').Types.ObjectId, role: string, sessionVersion?: number }} user */
export const createAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role, version: user.sessionVersion ?? 0, jti: randomUUID() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'bulldogs-exchange-api',
    audience: 'bulldogs-exchange-client',
  });

/** @param {string} token */
export const hashToken = token => createHash('sha256').update(token).digest('hex');

/** @param {{ _id: import('mongoose').Types.ObjectId, role: string, sessionVersion?: number }} user */
export async function issueAccessToken(user) {
  const token = createAccessToken(user);
  const payload = jwt.decode(token);
  if (!payload || typeof payload === 'string' || !payload.exp) throw new Error('Invalid session expiry');
  await Session.create({ tokenHash: hashToken(token), userId: user._id, expiresAt: new Date(payload.exp * 1000) });
  return token;
}

/** @param {string} token */
export const verifyAccessToken = (token) =>
  jwt.verify(token, JWT_SECRET, {
    issuer: 'bulldogs-exchange-api',
    audience: 'bulldogs-exchange-client',
  });
