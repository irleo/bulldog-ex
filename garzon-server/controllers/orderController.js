// @ts-check
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import { inTransaction } from '../utils/transaction.js';
import { isPrice, isStock } from '../utils/numbers.js';

import { HttpStatus, OrderStatus, UserRole } from "../config/constants.js";
import Order from "../models/orderModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import { escapeRegex, parsePagination } from "../utils/query.js";
import { validateBody } from '../utils/validation.js';

const orderPopulation = [
  { path: "userId", select: "firstName lastName email phone" },
  { path: "items.productId", select: "name slug sku images supplier" },
];

/** @type {readonly string[]} */
const orderStatuses = Object.values(OrderStatus);

/** @param {import('../middleware/errorHandlers.js').AppRequest['user']} user */
const requireCompletedPickupProfile = (user) => {
  const address = user.address ? { street: user.address.street, city: user.address.city, province: user.address.province, postalCode: user.address.postalCode } : undefined;
  validateBody('/users/me', 'PATCH', { phone: user.phone, address });
  if (
    !user.phone ||
    !address?.street ||
    !address.city ||
    !address.province ||
    !address.postalCode
  ) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "Complete your phone number and address before placing an order.",
    );
  }
  return { phone: user.phone, shippingAddress: { recipientName: `${user.firstName} ${user.lastName}`, ...address } };
};

export const createOrder = asyncHandler(async (request, response) => {
  const contact = requireCompletedPickupProfile(request.user);
  const key = request.get('Idempotency-Key');
  if (!key || !/^[a-f0-9-]{36}$/i.test(key)) throw new ApiError(400, 'A valid Idempotency-Key is required.');
  const order = await checkoutCart(String(request.user._id), key, request.body.cartId, request.body.revision, contact);
  await order.populate(orderPopulation);
  response.status(HttpStatus.CREATED).json({ success: true, message: 'Order placed successfully.', data: order });
});
export const listMyOrders = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = { userId: request.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate(orderPopulation)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  response.status(HttpStatus.OK).json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const listOrders = asyncHandler(async (request, response) => {
  const { page, limit, skip } = parsePagination(
    request.query.page,
    request.query.limit,
  );
  const filter = {};
  if (String(request.query.status)) {
    if (!orderStatuses.includes(String(request.query.status))) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "status is invalid.");
    }
    filter.status = request.query.status;
  }
  if (request.query.q) {
    filter.orderNumber = {
      $regex: escapeRegex(request.query.q),
      $options: "i",
    };
  }
  const sortField = String(request.query.sort ?? "createdAt");
  const direction = String(request.query.direction ?? "desc");
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

  const statusOrder = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.READY_FOR_CLAIMING,
    OrderStatus.CANCELLED,
    OrderStatus.CLAIMED,
  ];
  const sortDirection = direction === "asc" ? 1 : -1;
  const [result] = await Order.aggregate([
    { $match: filter },
    {
      $addFields: {
        completionRank: {
          $cond: [{ $eq: ["$status", OrderStatus.CLAIMED] }, 1, 0],
        },
        statusRank: { $indexOfArray: [statusOrder, "$status"] },
      },
    },
    {
      $sort: {
        completionRank: 1,
        [sortField === "status" ? "statusRank" : "createdAt"]: sortDirection,
        _id: 1,
      },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          { $project: { completionRank: 0, statusRank: 0 } },
        ],
        metadata: [{ $count: "total" }],
      },
    },
  ]);
  const orders = await Order.populate(result.data, orderPopulation);
  const total = result.metadata[0]?.total ?? 0;

  response.status(HttpStatus.OK).json({
    success: true,
    data: orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getOrder = asyncHandler(async (request, response) => {
  const filter = {
    _id: request.params.id,
    ...(request.user.role === UserRole.CUSTOMER ? { userId: request.user._id } : {}),
  };
  const order = await Order.findOne(filter).populate(orderPopulation).lean();
  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Order was not found.");
  }
  response.status(HttpStatus.OK).json({ success: true, data: order });
});

export const claimOrder = asyncHandler(async (request, response) => {
  const order = await Order.findOne({
    _id: request.params.id,
    userId: request.user._id,
  });
  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Order was not found.");
  }
  if (order.status !== OrderStatus.READY_FOR_CLAIMING) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      "Only an order that is ready for claiming can be marked as claimed.",
    );
  }

  const claimedOrder = await Order.findOneAndUpdate(
    { _id: order._id, userId: request.user._id, status: OrderStatus.READY_FOR_CLAIMING },
    { $set: { status: OrderStatus.CLAIMED } },
    { new: true, runValidators: true },
  ).populate(orderPopulation);
  if (!claimedOrder) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      "The order status changed before it could be claimed. Refresh and try again.",
    );
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Order marked as claimed.",
    data: claimedOrder,
  });
});

export const cancelMyOrder = asyncHandler(async (request, response) => {
  const order = await Order.findOne({
    _id: request.params.id,
    userId: request.user._id,
  })
    .select("status")
    .lean();
  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Order was not found.");
  }
  if (order.status !== OrderStatus.PENDING) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      "Only a pending order can be cancelled by the customer.",
    );
  }

  const cancelledOrder = await Order.findOneAndUpdate(
    {
      _id: request.params.id,
      userId: request.user._id,
      status: OrderStatus.PENDING,
    },
    { $set: { status: OrderStatus.CANCELLED } },
    { new: true, runValidators: true },
  ).populate(orderPopulation);
  if (!cancelledOrder) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      "The order status changed before it could be cancelled. Refresh and try again.",
    );
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Order cancelled successfully.",
    data: cancelledOrder,
  });
});

export const updateOrderStatus = asyncHandler(async (request, response) => {
  const order = await transitionOrder(String(request.params.id), request.body.status);
  await order.populate(orderPopulation);
  response.status(HttpStatus.OK).json({ success: true, message: `Order marked as ${order.status.replaceAll('_', ' ')}.`, data: order });
});
/** @param {string} userId @param {string} key @param {string} cartId @param {number} revision
 * @param {{phone:string, shippingAddress:Record<string, unknown>}} contact */
export async function checkoutCart(userId, key, cartId, revision, contact) {
  const existing = await Order.findOne({ userId, checkoutKey: key });
  if (existing) return existing;
  try {
    return await inTransaction(async (session) => {
      const replay = await Order.findOne({ userId, checkoutKey: key }).session(session);
      if (replay) return replay;
      const cart = await Cart.findOne({ _id: cartId, userId }).session(session).lean();
      if (!cart?.items.length || (cart.revision ?? 0) !== revision) {
        throw new ApiError(409, 'Your cart changed. Refresh it before placing an order.');
      }
      const products = await Product.find({ _id: { $in: cart.items.map(item => item.productId) } })
        .select('name sku price stock isActive').limit(100).session(session).lean();
      const items = cart.items.map(item => {
        const product = products.find(product => String(product._id) === String(item.productId));
        if (!product?.isActive || !isPrice(product.price) || !isStock(product.stock)
          || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || product.stock < item.quantity) {
          throw new ApiError(409, 'A product is unavailable or has invalid pricing. Refresh your cart.');
        }
        return { productId: product._id, productName: product.name, sku: product.sku,
          unitPrice: product.price, quantity: item.quantity, subtotal: Math.round(product.price * 100) * item.quantity / 100 };
      });
      const consumed = await Cart.updateOne({ _id: cart._id, items: cart.items },
        { $set: { items: [] }, $inc: { revision: 1 } }, { session });
      if (consumed.modifiedCount !== 1) throw new ApiError(409, 'Your cart changed. Refresh and try again.');
      const [order] = await Order.create([{ userId, checkoutKey: key, items, ...contact,
        totalAmount: items.reduce((sum, item) => sum + Math.round(item.subtotal * 100), 0) / 100 }], { session });
      return order;
    });
  } catch (error) {
    // A duplicate key or a lost commit response can be a successful earlier request.
    const replay = await Order.findOne({ userId, checkoutKey: key });
    if (replay) return replay;
    throw error;
  }
}

/** @type {Record<string, string[]>} */
const transitions = {
  pending: ['confirmed', 'cancelled'], confirmed: ['ready_for_claiming', 'cancelled'],
  ready_for_claiming: [], claimed: [], cancelled: [],
};

/** @param {string} id @param {string} nextStatus */
export async function transitionOrder(id, nextStatus) {
  return inTransaction(async (session) => {
    const order = await Order.findById(id).session(session);
    if (!order) throw new ApiError(404, 'Order was not found.');
    if (order.status === nextStatus) return order;
    if (!transitions[order.status]?.includes(nextStatus)) throw new ApiError(409, `Order cannot move from ${order.status} to ${nextStatus}.`);
    const direction = order.status === 'pending' && nextStatus === 'confirmed' ? -1
      : order.status === 'confirmed' && nextStatus === 'cancelled' ? 1 : 0;
    if (direction) {
      for (const item of order.items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 || !isPrice(item.unitPrice)) {
          throw new ApiError(409, 'The order contains invalid item values. Contact the administrator.');
        }
        const stock = direction < 0 ? { $gte: item.quantity, $lte: 1000000, $mod: /** @type {[number, number]} */ ([1, 0]) } : { $gte: 0, $lte: 1000000 - item.quantity, $mod: /** @type {[number, number]} */ ([1, 0]) };
        const result = await Product.updateOne({ _id: item.productId, stock,
          ...(direction < 0 ? { isActive: true, price: { $gte: 0.01, $lte: 1000000 } } : {}) },
        { $inc: { stock: direction * item.quantity } }, { session });
        if (result.modifiedCount !== 1) throw new ApiError(409, `${item.productName} has unavailable or invalid stock.`);
      }
    }
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status },
      { $set: { status: nextStatus } }, { returnDocument: 'after', runValidators: true, session });
    if (!updated) throw new ApiError(409, 'The order changed. Refresh and try again.');
    return updated;
  });
}
