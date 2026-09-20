// @ts-check
import { rateLimit } from "express-rate-limit";
import * as attempts from "../models/userModel.js";

/** @param {number} limit @param {number} windowMs @param {string} message */
export function createRequestLimiter(limit, windowMs, message) {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      const retryAfterSeconds =
        Number(response.getHeader("Retry-After")) || Math.ceil(windowMs / 1000);
      response.status(429).json({
        success: false,
        message,
        count: 0,
        data: null,
        error: { details: { retryAfterSeconds } },
      });
    },
  });
}

export const apiLimiter = createRequestLimiter(
  300,
  15 * 60_000,
  "Too many API requests. Please try again later.",
);
export const loginLimiter = createRequestLimiter(
  20,
  15 * 60_000,
  "Too many login requests. Please try again later.",
);
export const registrationLimiter = createRequestLimiter(
  5,
  60 * 60_000,
  "Too many registration requests. Please try again later.",
);
export const passwordLimiter = createRequestLimiter(
  5,
  15 * 60_000,
  "Too many password change requests. Please try again later.",
);
export const writeLimiter = createRequestLimiter(
  60,
  15 * 60_000,
  "Too many changes. Please try again later.",
);

/** @type {import('express').RequestHandler} */
export const mutationLimiter = (request, response, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return writeLimiter(request, response, next);
  }
  next();
};

/** @param {import('../models/userModel.js').AttemptState|null} state @param {number} now */
export function remainingCooldown(state, now) {
  if (!state || (state.loginFailuresExpireAt?.getTime() ?? 0) <= now) return 0;
  return Math.max(
    0,
    Math.ceil(((state.loginLockedUntil?.getTime() ?? 0) - now) / 1000),
  );
}

/** @param {import('express').Response} response @param {number} seconds */
export function sendLoginCooldown(response, seconds) {
  response.setHeader("Retry-After", seconds);
  response.status(429).json({
    success: false,
    message: `Too many failed login attempts. Try again in ${seconds} seconds.`,
    count: 0,
    data: null,
    error: { details: { retryAfterSeconds: seconds } },
  });
}

/** @type {import('express').RequestHandler} */
export const loginProtectionMiddleware = async (request, response, next) => {
  try {
    const email = request.body.email;
    const seconds = remainingCooldown(
      await attempts.findAttempt(email),
      Date.now(),
    );
    if (seconds) return sendLoginCooldown(response, seconds);
    next();
  } catch (error) {
    next(error);
  }
};
