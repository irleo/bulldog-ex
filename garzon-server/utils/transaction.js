// @ts-check
import mongoose from 'mongoose';
import { ApiError } from '../middleware/errorHandlers.js';

/** @template T @param {(session: import('mongoose').ClientSession) => Promise<T>} work @returns {Promise<T>} */
export async function inTransaction(work) {
  try {
    return await mongoose.connection.transaction(work, {
      readPreference: 'primary', readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 20) {
      throw new ApiError(503, 'This operation requires a MongoDB replica set. Contact the administrator.');
    }
    throw error;
  }
}
