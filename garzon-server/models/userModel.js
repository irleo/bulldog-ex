import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { UserRole } from "../config/constants.js";

// Existing accounts can supply student details through their profile without a backfill.
/** @this {{isNew: boolean, role: string}} */
function requiredForNewCustomer() {
  return this.isNew && this.role === UserRole.CUSTOMER;
}

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, maxlength: 160, default: "" },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    province: { type: String, trim: true, maxlength: 80, default: "" },
    postalCode: { type: String, trim: true, maxlength: 12, default: "" },
  },
  { _id: false, strict: "throw" },
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required."],
      match: [/^[\p{L}\p{M} .’'\-]+$/u, "Please enter a valid first name."],
      trim: true,
      minlength: [2, "First name must contain at least 2 characters."],
      maxlength: [80, "First name cannot exceed 80 characters."],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required."],
      match: [/^[\p{L}\p{M} .’'\-]+$/u, "Please enter a valid last name."],
      trim: true,
      minlength: [2, "Last name must contain at least 2 characters."],
      maxlength: [80, "Last name cannot exceed 80 characters."],
    },
    studentNumber: {
      type: String,
      trim: true,
      required: [requiredForNewCustomer, "Student number is required."],
      match: [/^\d{4}-\d{6}$/, "Student number must use the format ####-###### (e.g. 2023-123456)."],
    },
    course: {
      type: String,
      trim: true,
      required: [requiredForNewCustomer, "Course is required."],
      minlength: [2, "Course must contain at least 2 characters."],
      maxlength: [120, "Course cannot exceed 120 characters."],
    },
    yearLevel: {
      type: String,
      trim: true,
      required: [requiredForNewCustomer, "Year level is required."],
      minlength: [1, "Year level is required."],
      maxlength: [30, "Year level cannot exceed 30 characters."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email format is invalid."],
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
      minlength: [20, "Password hash is invalid."],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: "Role must be customer or admin.",
      },
      default: UserRole.CUSTOMER,
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^(?:\+63|0)9\d{9}$/,
        "Phone must be a valid Philippine mobile number.",
      ],
      default: undefined,
    },
    address: { type: addressSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      select: false,
    },
    loginLockedUntil: { type: Date, default: null, select: false },
    loginFailuresExpireAt: { type: Date, default: null, select: false },
  },
  {
    timestamps: true,
    strict: "throw",
    toJSON: { virtuals: true },
    versionKey: false,
  },
);

userSchema.virtual("fullName").get(function getFullName() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre("validate", async function hashPassword() {
  if (!this.isModified("passwordHash") || /^\$2[aby]\$/.test(this.passwordHash))
    return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.matchesPassword = function matchesPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ lastName: 1, firstName: 1 });
userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model("User", userSchema, "users");

export default User;

export const FAILURE_RETENTION_MS = 24 * 60 * 60_000;
/** @typedef {{failedLoginAttempts: number, loginLockedUntil: Date|null, loginFailuresExpireAt: Date|null}} AttemptState */

/** @param {string} email @returns {Promise<AttemptState|null>} */
export async function findAttempt(email) {
  return User.findOne({ email })
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
  return User.findOneAndUpdate({ email }, pipeline, {
    returnDocument: "after",
    updatePipeline: true,
    timestamps: false,
  })
    .select("failedLoginAttempts loginLockedUntil loginFailuresExpireAt")
    .lean()
    .exec();
}
/** @param {string} email @param {Date} now @returns {Promise<void>} */
export async function resetFailures(email, now) {
  // Never erase a lock imposed by a concurrent failed login.
  await User.updateOne(
    {
      email,
      $or: [{ loginLockedUntil: null }, { loginLockedUntil: { $lte: now } }],
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
