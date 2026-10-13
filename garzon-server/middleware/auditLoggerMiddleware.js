// @ts-check
import Log from '../models/logModel.js';
import { waitUntil } from '@vercel/functions';

/** @typedef {{level: 'info'|'warn'|'error', method: string, path: string, ip: string, userId: import('mongoose').Types.ObjectId|null, statusCode: number, durationMs: number}} AuditEntry */

/** @param {AuditEntry} entry @returns {Promise<void>} */
async function writeAuditLog(entry) {
  await Log.create(entry);
}

/**
 * Register before parsers/authentication; read the authenticated identity at finish.
 * @param {(entry: AuditEntry) => Promise<void>} [writeLog]
 * @returns {import('express').RequestHandler}
 */
export function createAuditLogger(writeLog = writeAuditLog) {
  let pending = 0;
  let lastThrottleLog = 0;
  return (request, response, next) => {
    if (!request.originalUrl.startsWith('/api/v1/')) return next();
    const started = performance.now();
    // Exclude query strings, which may contain credentials or personal data.
    const path = request.originalUrl.split('?')[0].slice(0, 2048);
    // Register before finish while Vercel's request context is available.
    /** @type {((value?: void | PromiseLike<void>) => void) | undefined} */
    let complete;
    if (process.env.VERCEL === '1') {
      waitUntil(new Promise(resolve => { complete = resolve; }));
      response.once('close', () => { if (!response.writableFinished) complete?.(); });
    }
    response.once('finish', () => {
      const authenticatedRequest = /** @type {import('express').Request & {user?: {_id: import('mongoose').Types.ObjectId}}} */ (request);
      const statusCode = response.statusCode;
      // Cap outstanding writes and sample throttled traffic to protect the database.
      if (pending >= 32 || (statusCode === 429 && Date.now() - lastThrottleLog < 60000)) {
        complete?.();
        return;
      }
      if (statusCode === 429) lastThrottleLog = Date.now();
      pending += 1;
      const write = async () => {
        try {
          await writeLog({
            level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
            method: request.method.slice(0, 32), path,
            ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
            userId: authenticatedRequest.user?._id ?? null,
            statusCode, durationMs: Math.max(0, Math.round(performance.now() - started)),
          });
        } catch (error) {
          // Logging must never replace an already completed API response.
          console.error('Audit log output failed:', error instanceof Error ? error.name : 'UnknownError');
        } finally {
          pending -= 1;
          complete?.();
        }
      };
      void write();
    });
    next();
  };
}

export const auditLoggerMiddleware = createAuditLogger();
