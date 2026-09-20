import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpStatus, UserRole } from "../config/constants.js";
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/config.js';
import User from "../models/userModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import {
  escapeRegex,
  parseOptionalBoolean,
  parsePagination,
} from "../utils/query.js";
import { selectFields } from "../utils/selectFields.js";
import { findAttempt, recordFailure, resetFailures } from '../models/userModel.js';
import { remainingCooldown, sendLoginCooldown } from '../middleware/rateLimiterMiddleware.js';

const registrationFields = [
  "firstName",
  "lastName",
  "studentNumber",
  "course",
  "yearLevel",
  "email",
  "phone",
  "address",
];
const profileFields = ["firstName", "lastName", "studentNumber", "course", "yearLevel", "phone", "address"];
const adminEditableFields = [
  "firstName",
  "lastName",
  "studentNumber",
  "course",
  "yearLevel",
  "email",
  "phone",
  "address",
];
const userProjection =
  "firstName lastName studentNumber course yearLevel email role phone address isActive createdAt updatedAt";

export const serializeUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  studentNumber: user.studentNumber,
  course: user.course,
  yearLevel: user.yearLevel,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (request, response) => {
  const password = String(request.body.password ?? "");
  if (password.length < 8) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Password must contain at least 8 characters.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    ...selectFields(request.body, registrationFields),
    passwordHash,
    role: UserRole.CUSTOMER,
  });

  response.status(HttpStatus.CREATED).json({
    success: true,
    message: "Account created successfully.",
    data: { user: serializeUser(user) },
  });
});

export const login = asyncHandler(async (request, response) => {
  const email = String(request.body.email ?? "").trim().toLowerCase();
  const password = String(request.body.password ?? "");
  if (!email || !password) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Email and password are required.",
    );
  }

  const user = await User.findOne({ email }).select("+passwordHash");

  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  if (!user || !passwordMatches) {
    const state = await recordFailure(email, new Date());
    const seconds = remainingCooldown(state, Date.now());
    if (seconds) return sendLoginCooldown(response, seconds);
    throw new ApiError(
      HttpStatus.UNAUTHORIZED,
      "Email or password is incorrect.",
    );
  }
  if (!user.isActive) {
    throw new ApiError(HttpStatus.FORBIDDEN, "This account is inactive.");
  }

  await resetFailures(email, new Date());
  const seconds = remainingCooldown(await findAttempt(email), Date.now());
  if (seconds) return sendLoginCooldown(response, seconds);
  // Associate the successful sign-in with the completed request's audit entry.
  request.user = user;

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Signed in successfully.",
    data: {
      token: jwt.sign(
        { sub: String(user._id), role: user.role },
        JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES_IN,
          issuer: 'bulldogs-exchange-api',
          audience: 'bulldogs-exchange-client',
        },
      ),
      user: serializeUser(user),
    },
  });
});

export const logout = asyncHandler(async (_request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Signed out successfully.',
    data: null,
  });
});

export const getSession = asyncHandler(async (request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    data: { user: serializeUser(request.user) },
  });
});

const assertUserCanAccessTarget = (request, targetUserId) => {
  const isAdmin = request.user.role === UserRole.ADMIN;
  const isSameUser = String(request.user._id) === String(targetUserId);

  if (!isAdmin && !isSameUser) {
    throw new ApiError(
      HttpStatus.FORBIDDEN,
      "You can only edit your own user information.",
    );
  }
};

export const getMyProfile = asyncHandler(async (request, response) => {
  response.status(HttpStatus.OK).json({ success: true, data: request.user });
});

export const updateMyProfile = asyncHandler(async (request, response) => {
  const user = await User.findByIdAndUpdate(
    request.user._id,
    { $set: selectFields(request.body, profileFields) },
    { new: true, runValidators: true },
  ).select(userProjection);

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Profile updated successfully.",
    data: user,
  });
});

export const changeMyPassword = asyncHandler(async (request, response) => {
  const currentPassword = String(request.body.currentPassword ?? "");
  const newPassword = String(request.body.newPassword ?? "");
  if (!currentPassword || newPassword.length < 8) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Current password and a new password of at least 8 characters are required.",
    );
  }

  const user = await User.findById(request.user._id).select("+passwordHash");
  if (!user || !(await user.matchesPassword(currentPassword))) {
    throw new ApiError(
      HttpStatus.UNAUTHORIZED,
      "Current password is incorrect.",
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Password changed successfully.",
    data: null,
  });
});

export const listUsers = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {};

  if (request.query.role) {
    if (!Object.values(UserRole).includes(request.query.role)) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "role is invalid.");
    }
    filter.role = request.query.role;
  }
  const isActive = parseOptionalBoolean(request.query.isActive, "isActive");
  if (isActive !== undefined) filter.isActive = isActive;
  if (request.query.q) {
    const pattern = escapeRegex(request.query.q);
    filter.$or = [
      { firstName: { $regex: pattern, $options: "i" } },
      { lastName: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
    ];
  }

  const sortField = request.query.sort ?? "createdAt";
  const direction = request.query.direction ?? "desc";
  if (!new Set(["createdAt", "status"]).has(sortField)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "sort must be createdAt or status.",
    );
  }
  if (!new Set(["asc", "desc"]).has(direction)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "direction must be asc or desc.",
    );
  }
  const userSort =
    sortField === "status"
      ? { isActive: direction === "asc" ? -1 : 1, createdAt: -1, _id: 1 }
      : { isActive: -1, createdAt: direction === "asc" ? 1 : -1, _id: 1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(userProjection)
      .sort(userSort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getUser = asyncHandler(async (request, response) => {
  assertUserCanAccessTarget(request, request.params.id);

  const user = await User.findById(request.params.id)
    .select(userProjection)
    .lean();
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }
  response.status(HttpStatus.OK).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (request, response) => {
  assertUserCanAccessTarget(request, request.params.id);
  if (request.user.role !== UserRole.ADMIN && request.body.email !== undefined) {
    throw new ApiError(HttpStatus.FORBIDDEN, 'Email changes on this route require an administrator.');
  }

  const fields =
    request.user.role === UserRole.ADMIN
      ? adminEditableFields
      : profileFields;
  const user = await User.findByIdAndUpdate(
    request.params.id,
    { $set: selectFields(request.body, fields) },
    { new: true, runValidators: true },
  )
    .select(userProjection)
    .lean();

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }
  response.status(HttpStatus.OK).json({
    success: true,
    message: "User updated successfully.",
    data: user,
  });
});

export const setUserStatus = asyncHandler(async (request, response) => {
  if (typeof request.body.isActive !== "boolean") {
    throw new ApiError(HttpStatus.BAD_REQUEST, "isActive must be a boolean.");
  }
  const targetUser = await User.findById(request.params.id).select("role").lean();
  if (!targetUser) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }
  if (targetUser.role === UserRole.ADMIN) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Administrator accounts cannot be suspended or reactivated here.",
    );
  }

  const user = await User.findByIdAndUpdate(
    request.params.id,
    { $set: { isActive: request.body.isActive } },
    { new: true, runValidators: true },
  )
    .select(userProjection)
    .lean();

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }
  response.status(HttpStatus.OK).json({
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"} successfully.`,
    data: user,
  });
});

export const deleteUser = asyncHandler(async (request, response) => {
  if (String(request.user._id) === String(request.params.id)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "You cannot delete your own administrator account.",
    );
  }

  const user = await User.findByIdAndDelete(request.params.id).select(
    "_id firstName lastName email role",
  );

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: "User deleted successfully.",
    count: 1,
    data: { _id: user._id, deleted: true },
  });
});
