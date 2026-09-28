import mongoose from "mongoose";
import { createHmac } from "node:crypto";
import { JWT_SECRET } from "../config/config.js";
const LoginAttemptSchema = new mongoose.Schema(
  {
    emailHash: { type: String, required: true },
    failedLoginAttempts: { type: Number, default: 0 },
    loginLockedUntil: { type: Date, default: null },
    loginFailuresExpireAt: { type: Date, required: true },
  },
  { timestamps: true },
);
LoginAttemptSchema.index({ emailHash: 1 }, { unique: true });
LoginAttemptSchema.index(
  { loginFailuresExpireAt: 1 },
  { expireAfterSeconds: 0 },
);
const LoginAttempt = mongoose.model(
  "LoginAttempt",
  LoginAttemptSchema,
  "loginAttempts",
);
/** @param {string} email */
const hashEmail = (email) =>
  createHmac("sha256", JWT_SECRET).update(email).digest("hex");
export const FAILURE_RETENTION_MS = 24 * 60 * 60_000;
/** @typedef {{failedLoginAttempts: number, loginLockedUntil: Date|null, loginFailuresExpireAt: Date|null}} AttemptState */

/** @param {string} email @returns {Promise<AttemptState|null>} */
export async function findAttempt(email) {
  return LoginAttempt.findOne({ emailHash: hashEmail(email) })
    .select("failedLoginAttempts loginLockedUntil loginFailuresExpireAt")
    .lean()
    .exec();
}

/**
 * One atomic update increments the counter and applies the cooldown. Concurrent
 * failures received during a newly imposed lock cannot increase or extend it.
 * @param {string} email @param {Date} now @returns {Promise<AttemptState|null>}
 */
export async function recordFailure(email, now) {
  const isLocked = {
    $gt: [{ $ifNull: ["$loginLockedUntil", new Date(0)] }, now],
  };
  const expired = {
    $lte: [{ $ifNull: ["$loginFailuresExpireAt", new Date(0)] }, now],
  };
  const count = {
    $cond: [expired, 0, { $ifNull: ["$failedLoginAttempts", 0] }],
  };
  const pipeline = [
    {
      $set: {
        failedLoginAttempts: {
          $cond: [
            isLocked,
            "$failedLoginAttempts",
            { $min: [10, { $add: [count, 1] }] },
          ],
        },
        updatedAt: { $cond: [isLocked, "$updatedAt", now] },
        loginFailuresExpireAt: {
          $cond: [
            isLocked,
            "$loginFailuresExpireAt",
            new Date(now.getTime() + FAILURE_RETENTION_MS),
          ],
        },
      },
    },
    {
      $set: {
        loginLockedUntil: {
          $cond: [
            isLocked,
            "$loginLockedUntil",
            {
              $switch: {
                branches: [
                  {
                    case: { $gte: ["$failedLoginAttempts", 10] },
                    then: new Date(now.getTime() + 30 * 60_000),
                  },
                  {
                    case: { $gte: ["$failedLoginAttempts", 8] },
                    then: new Date(now.getTime() + 5 * 60_000),
                  },
                  {
                    case: { $gte: ["$failedLoginAttempts", 5] },
                    then: new Date(now.getTime() + 3 * 60_000),
                  },
                ],
                default: null,
              },
            },
          ],
        },
      },
    },
  ];
  return LoginAttempt.findOneAndUpdate(
    { emailHash: hashEmail(email) },
    pipeline,
    {
      upsert: true,
      returnDocument: "after",
      updatePipeline: true,
      timestamps: false,
    },
  )
    .select("failedLoginAttempts loginLockedUntil loginFailuresExpireAt")
    .lean()
    .exec();
}
/** @param {string} email @param {Date} now @returns {Promise<void>} */
export async function resetFailures(email, now) {
  // Successful authentication after cooldown clears the failure history.
  await LoginAttempt.updateOne(
    {
      emailHash: hashEmail(email),
    },
    {
      $set: {
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        loginFailuresExpireAt: new Date(now.getTime() + FAILURE_RETENTION_MS),
      },
    },
  ).exec();
}
