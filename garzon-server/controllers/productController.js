import mongoose from 'mongoose';
import { HttpStatus } from '../config/constants.js';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  escapeRegex,
  parseOptionalBoolean,
  parseOptionalNonNegativeNumber,
  parsePagination,
} from '../utils/query.js';

const categoryPopulation = { path: 'categoryId', select: 'name slug' };
const productFields = [
  'name',
  'sku',
  'price',
  'stock',
  'categoryId',
  'supplier',
  'images',
  'isActive',
];

/** @param {Record<string, unknown>} source */
const selectProductFields = (source) =>
  Object.fromEntries(
    productFields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );

/** @param {unknown} rawSort */
const parseProductSort = (rawSort) => {
  const requested = String(rawSort ?? '-createdAt');
  const descending = requested.startsWith('-');
  const field = descending ? requested.slice(1) : requested;
  const allowedFields = new Set(['name', 'price', 'stock', 'createdAt']);

  if (!allowedFields.has(field)) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'sort must be name, price, stock, createdAt, or the descending form prefixed with -.',
    );
  }

  return { [field]: descending ? -1 : 1, _id: 1 };
};

/** @param {unknown} rawCategory */
const resolveCategoryId = async (rawCategory) => {
  if (rawCategory === undefined) return undefined;

  const category = String(rawCategory).trim();
  if (!category) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'category cannot be empty.');
  }

  if (mongoose.isObjectIdOrHexString(category)) return category;

  const pattern = `^${escapeRegex(category)}$`;
  const match = await Category.findOne({
    $or: [
      { name: { $regex: pattern, $options: 'i' } },
      { slug: { $regex: pattern, $options: 'i' } },
    ],
  })
    .select('_id')
    .lean();

  return match?._id ?? null;
};

export const createProduct = asyncHandler(async (request, response) => {
  const product = await Product.create(selectProductFields(request.body));
  await product.populate(categoryPopulation);
  response.status(HttpStatus.CREATED).json({
    success: true,
    message: 'Product created successfully.',
    count: 1,
    data: product,
  });
});

export const listProducts = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const categoryId = await resolveCategoryId(
    request.query.category ?? request.query.categoryId,
  );
  const isActive = parseOptionalBoolean(request.query.isActive, 'isActive');
  const minPrice = parseOptionalNonNegativeNumber(
    request.query.minPrice,
    'minPrice',
  );
  const maxPrice = parseOptionalNonNegativeNumber(
    request.query.maxPrice,
    'maxPrice',
  );
  const filter = {};

  if (categoryId !== undefined) filter.categoryId = categoryId;
  if (isActive !== undefined) filter.isActive = isActive;
  if (request.query.supplier) {
    filter.supplier = {
      $regex: `^${escapeRegex(request.query.supplier)}$`,
      $options: 'i',
    };
  }

  const search = request.query.search ?? request.query.q;
  if (search) {
    const pattern = escapeRegex(search);
    filter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { sku: { $regex: pattern, $options: 'i' } },
      { supplier: { $regex: pattern, $options: 'i' } },
    ];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {
      ...(minPrice !== undefined ? { $gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { $lte: maxPrice } : {}),
    };
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      'minPrice cannot be greater than maxPrice.',
    );
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate(categoryPopulation)
      .sort(parseProductSort(request.query.sort))
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Products retrieved successfully.',
    count: products.length,
    data: products,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getProduct = asyncHandler(async (request, response) => {
  const product = await Product.findById(request.params.id).populate(
    categoryPopulation,
  );

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Product was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Product retrieved successfully.',
    count: 1,
    data: product,
  });
});

export const updateProduct = asyncHandler(async (request, response) => {
  const product = await Product.findByIdAndUpdate(
    request.params.id,
    selectProductFields(request.body),
    { new: true, runValidators: true },
  ).populate(categoryPopulation);

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Product was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Product updated successfully.',
    count: 1,
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (request, response) => {
  const product = await Product.findByIdAndDelete(request.params.id);

  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Product was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: 'Product deleted successfully.',
    count: 1,
    data: { id: product.id, deleted: true },
  });
});
