import { HttpStatus, UserRole } from "../config/constants.js";
import User from "../models/userModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import { selectFields } from "../utils/selectFields.js";
import { createAccessToken } from "../utils/token.js";

const registrationFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
];

const serializeUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
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

  const user = await User.create({
    ...selectFields(request.body, registrationFields),
    passwordHash: password,
    role: UserRole.CUSTOMER,
  });

  response.status(HttpStatus.CREATED).json({
    success: true,
    message: "Account created successfully.",
    data: { user: serializeUser(user) },
  });
});

export const login = asyncHandler(async (request, response) => {
  const email = String(request.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(request.body.password ?? "");
  if (!email || !password) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Email and password are required.",
    );
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.matchesPassword(password))) {
    throw new ApiError(
      HttpStatus.UNAUTHORIZED,
      "Email or password is incorrect.",
    );
  }
  if (!user.isActive) {
    throw new ApiError(HttpStatus.FORBIDDEN, "This account is inactive.");
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Signed in successfully.",
    data: { token: createAccessToken(user), user: serializeUser(user) },
  });
});

export const logout = asyncHandler(async (_request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Signed out successfully.",
    data: null,
  });
});

export const getSession = asyncHandler(async (request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    data: { user: serializeUser(request.user) },
  });
});
