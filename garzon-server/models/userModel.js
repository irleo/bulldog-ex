import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserRole } from '../config/constants.js';

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    province: { type: String, trim: true, maxlength: 80, default: '' },
    postalCode: { type: String, trim: true, maxlength: 12, default: '' },
  },
  { _id: false, strict: 'throw' },
);

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      minlength: [2, 'First name must contain at least 2 characters.'],
      maxlength: [80, 'First name cannot exceed 80 characters.'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      minlength: [2, 'Last name must contain at least 2 characters.'],
      maxlength: [80, 'Last name cannot exceed 80 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters.'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email format is invalid.'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      minlength: [20, 'Password hash is invalid.'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: 'Role must be customer or admin.',
      },
      default: UserRole.CUSTOMER,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^(?:\+63|0)9\d{9}$/, 'Phone must be a valid Philippine mobile number.'],
      default: undefined,
    },
    address: { type: addressSchema, default: undefined },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    strict: 'throw',
    toJSON: { virtuals: true },
    versionKey: false,
  },
);

userSchema.virtual('fullName').get(function getFullName() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('validate', async function hashPassword() {
  if (
    !this.isModified('passwordHash') ||
    /^\$2[aby]\$/.test(this.passwordHash)
  ) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.matchesPassword = function matchesPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ lastName: 1, firstName: 1 });
userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model('User', userSchema, 'users');

export default User;
