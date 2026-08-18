import { HttpStatus } from '../config/constants.js';
import Order from '../models/orderModel.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination } from '../utils/query.js';

const orderPopulation = [
  { path: 'userId', select: 'firstName lastName email' },
  { path: 'items.productId', select: 'name sku' },
];

export const createOrder = asyncHandler(async (request, response) => {
  const order = await Order.create(request.body);
  await order.populate(orderPopulation);
  response.status(HttpStatus.CREATED).json({ success: true, data: order });
});

export const listOrders = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {
    ...(request.query.userId ? { userId: request.query.userId } : {}),
    ...(request.query.status ? { status: request.query.status } : {}),
    ...(request.query.paymentStatus
      ? { paymentStatus: request.query.paymentStatus }
      : {}),
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate(orderPopulation)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getOrder = asyncHandler(async (request, response) => {
  const order = await Order.findById(request.params.id).populate(
    orderPopulation,
  );

  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Order was not found.');
  }

  response.status(HttpStatus.OK).json({ success: true, data: order });
});

export const updateOrder = asyncHandler(async (request, response) => {
  const order = await Order.findById(request.params.id);

  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Order was not found.');
  }

  order.set(request.body);
  await order.save();
  await order.populate(orderPopulation);

  response.status(HttpStatus.OK).json({ success: true, data: order });
});

export const deleteOrder = asyncHandler(async (request, response) => {
  const order = await Order.findByIdAndDelete(request.params.id);

  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, 'Order was not found.');
  }

  response.status(HttpStatus.OK).json({
    success: true,
    data: { id: order.id, deleted: true },
  });
});
