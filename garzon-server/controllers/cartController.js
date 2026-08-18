import { HttpStatus } from '../config/constants.js';
import Cart from '../models/cartModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/query.js';

const cartPopulation = [
  { path: 'userId', select: 'firstName lastName email' },
  { path: 'items.productId', select: 'name sku price stock' },
];

export const createCart = asyncHandler(async (request, response) => {
  const cart = await Cart.create(request.body);
  await cart.populate(cartPopulation);
  response.status(HttpStatus.CREATED).json({ success: true, data: cart });
});

export const listCarts = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = request.query.userId ? { userId: request.query.userId } : {};

  const [carts, total] = await Promise.all([
    Cart.find(filter)
      .populate(cartPopulation)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Cart.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: carts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getCart = asyncHandler(async (request, response) => {
  const cart = await Cart.findById(request.params.id).populate(cartPopulation);

  if (!cart) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Cart was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: cart });
});

export const updateCart = asyncHandler(async (request, response) => {
  const cart = await Cart.findByIdAndUpdate(request.params.id, request.body, {
    new: true,
    runValidators: true,
  }).populate(cartPopulation);

  if (!cart) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Cart was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: cart });
});

export const deleteCart = asyncHandler(async (request, response) => {
  const cart = await Cart.findByIdAndDelete(request.params.id);

  if (!cart) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Cart was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    data: { id: cart.id, deleted: true },
  });
});
