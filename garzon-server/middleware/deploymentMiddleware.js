// @ts-check
import { isIP } from 'node:net';
import connectDB from '../config/db.js';
import { ApiError } from './errorHandlers.js';

/** @type {import('express').RequestHandler} */
export const vercelClientIp = (request, _response, next) => {
  // Trust this managed header only inside Vercel's runtime.
  if (process.env.VERCEL === '1') {
    const ip = request.get('x-vercel-forwarded-for')?.trim();
    if (!ip || !isIP(ip)) return next(new ApiError(400, 'Client address is unavailable.'));
    Object.defineProperty(request, 'ip', { value: ip, configurable: true });
  }
  next();
};

/** @type {import('express').RequestHandler} */
export const databaseReady = async (_request, _response, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    // connectDB logs the error class without exposing credentials to the response.
    next(new ApiError(503, 'The store is temporarily unavailable. Please try again.'));
  }
};
