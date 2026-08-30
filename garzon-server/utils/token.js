import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/config.js';

/** @param {{ _id: import('mongoose').Types.ObjectId, role: string }} user */
export const createAccessToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'bulldogs-exchange-api',
    audience: 'bulldogs-exchange-client',
  });

/** @param {string} token */
export const verifyAccessToken = (token) =>
  jwt.verify(token, JWT_SECRET, {
    issuer: 'bulldogs-exchange-api',
    audience: 'bulldogs-exchange-client',
  });
