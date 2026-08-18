import { HttpStatus } from '../config/constants.js';
import Category from '../models/categoryModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { escapeRegex, parsePagination } from '../utils/query.js';

export const createCategory = asyncHandler(async (request, response) => {
  const category = await Category.create(request.body);
  response.status(HttpStatus.CREATED).json({ success: true, data: category });
});

export const listCategories = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {
    ...(request.query.isActive !== undefined
      ? { isActive: request.query.isActive === 'true' }
      : {}),
    ...(request.query.q
      ? {
          name: {
            $regex: escapeRegex(request.query.q),
            $options: 'i',
          },
        }
      : {}),
  };

  const [categories, total] = await Promise.all([
    Category.find(filter).sort('name').skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: categories,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getCategory = asyncHandler(async (request, response) => {
  const category = await Category.findById(request.params.id);

  if (!category) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Category was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (request, response) => {
  const category = await Category.findByIdAndUpdate(
    request.params.id,
    request.body,
    { new: true, runValidators: true },
  );

  if (!category) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Category was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (request, response) => {
  const category = await Category.findByIdAndDelete(request.params.id);

  if (!category) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Category was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    data: { id: category.id, deleted: true },
  });
});
