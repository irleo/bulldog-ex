// @ts-check
import { createHmac } from 'node:crypto';
import RequestQuota from '../models/requestQuotaModel.js';
import { JWT_SECRET } from '../config/config.js';

/** @typedef {import('express-rate-limit').Store} Store */

/** Shared fixed-window quotas; expiry is checked in the key, independently of TTL cleanup.
 * @implements {Store} */
export class RequestQuotaStore {
  /** @param {number} windowMs @param {string} prefix */
  constructor(windowMs, prefix) { this.windowMs = windowMs; this.prefix = prefix; this.localKeys = false; }
  /** @param {string} key */
  identity(key) {
    const bucket = Math.floor(Date.now() / this.windowMs);
    return { id: `${this.prefix}:${bucket}:${createHmac('sha256', JWT_SECRET).update(key).digest('hex')}`,
      resetTime: new Date((bucket + 1) * this.windowMs) };
  }
  /** @param {string} key */
  async increment(key) {
    const { id, resetTime } = this.identity(key);
    try {
      const row = await RequestQuota.findOneAndUpdate({ _id: id }, { $inc: { hits: 1 }, $setOnInsert: { expiresAt: resetTime } }, { upsert: true, returnDocument: 'after' });
      return { totalHits: row.hits, resetTime };
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) throw error;
      const row = await RequestQuota.findOneAndUpdate({ _id: id }, { $inc: { hits: 1 } }, { returnDocument: 'after' }).orFail();
      return { totalHits: row.hits, resetTime };
    }
  }
  /** @param {string} key */
  async decrement(key) { await RequestQuota.updateOne({ _id: this.identity(key).id, hits: { $gt: 0 } }, { $inc: { hits: -1 } }); }
  /** @param {string} key */
  async resetKey(key) { await RequestQuota.deleteOne({ _id: this.identity(key).id }); }
}
