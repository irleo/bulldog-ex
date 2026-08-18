import { HttpStatus } from '../config/constants.js';
import User from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, parsePagination } from '../utils/query.js';

const sanitizeUser = (document) => {
  const user = document.toJSON();
  delete user.passwordHash;
  return user;
};

export const createUser = asyncHandler(async (request, response) => {
  const user = await User.create(request.body);
  response
    .status(HttpStatus.CREATED)
    .json({ success: true, data: sanitizeUser(user) });
});

export const listUsers = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {};

  if (request.query.role) filter.role = request.query.role;
  if (request.query.isActive !== undefined) {
    filter.isActive = request.query.isActive === 'true';
  }
  if (request.query.q) {
    const pattern = escapeRegex(request.query.q);
    filter.$or = [
      { firstName: { $regex: pattern, $options: 'i' } },
      { lastName: { $regex: pattern, $options: 'i' } },
      { email: { $regex: pattern, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: users.map(sanitizeUser),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getUser = asyncHandler(async (request, response) => {
  const user = await User.findById(request.params.id);

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'User was not found.');
  }

  response
    .status(HttpStatus.OK)
    .json({ success: true, data: sanitizeUser(user) });
});

export const updateUser = asyncHandler(async (request, response) => {
  const user = await User.findByIdAndUpdate(request.params.id, request.body, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'User was not found.');
  }

  response
    .status(HttpStatus.OK)
    .json({ success: true, data: sanitizeUser(user) });
});

export const deleteUser = asyncHandler(async (request, response) => {
  const user = await User.findByIdAndDelete(request.params.id);

  if (!user) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'User was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    data: { id: user.id, deleted: true },
  });
});
