import { HttpStatus, UserRole } from "../config/constants.js";
import User from "../models/userModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import {
  escapeRegex,
  parseOptionalBoolean,
  parsePagination,
} from "../utils/query.js";
import { selectFields } from "../utils/selectFields.js";

const profileFields = ["firstName", "lastName", "phone", "address"];
const adminEditableFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
];
const userProjection =
  "firstName lastName email role phone address isActive createdAt updatedAt";

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

  user.passwordHash = newPassword;
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
  const user = await User.findById(request.params.id)
    .select(userProjection)
    .lean();
  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, "User was not found.");
  }
  response.status(HttpStatus.OK).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (request, response) => {
  const user = await User.findByIdAndUpdate(
    request.params.id,
    { $set: selectFields(request.body, adminEditableFields) },
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
