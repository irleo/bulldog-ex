import { HttpStatus, OrderStatus, UserRole } from "../config/constants.js";
import Cart from "../models/cartModel.js";
import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";
import { escapeRegex, parsePagination } from "../utils/query.js";
import { numeric, validateBody } from '../utils/validation.js';

const orderPopulation = [
  { path: "userId", select: "firstName lastName email phone" },
  { path: "items.productId", select: "name slug sku images supplier" },
];

const orderStatuses = Object.values(OrderStatus);

const allowedTransitions = {
  [OrderStatus.PENDING]: new Set([OrderStatus.CONFIRMED, OrderStatus.CANCELLED]),
  [OrderStatus.CONFIRMED]: new Set([OrderStatus.READY_FOR_CLAIMING, OrderStatus.CANCELLED]),
  [OrderStatus.READY_FOR_CLAIMING]: new Set(),
  [OrderStatus.CLAIMED]: new Set(),
  [OrderStatus.CANCELLED]: new Set(),
};

const requireCompletedPickupProfile = (user) => {
  validateBody('/users/me', 'PATCH', { phone: user.phone, address: user.address?.toObject() });
  const address = user.address;
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
};

const adjustInventory = async (items, direction) => {
  const adjusted = [];
  try {
    for (const item of items) {
      const update = { $inc: { stock: direction * item.quantity } };
      const filter = {
        _id: item.productId,
        ...(direction < 0 ? { stock: { $gte: item.quantity }, isActive: true } : {}),
      };
      const product = await Product.findOneAndUpdate(filter, update, {
        new: true,
      });
      if (!product) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          `${item.productName} no longer has enough stock.`,
        );
      }
      adjusted.push(item);
    }
  } catch (error) {
    for (const item of adjusted) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: -direction * item.quantity } },
      );
    }
    throw error;
  }
};

export const createOrder = asyncHandler(async (request, response) => {
  requireCompletedPickupProfile(request.user);
  const cart = await Cart.findOne({ userId: request.user._id }).populate({
    path: "items.productId",
    select: "name sku price stock isActive",
  });

  if (!cart?.items.length) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "Your cart is empty.");
  }

  const items = cart.items.map((item) => {
    const product = item.productId;
    numeric(item.quantity, 'quantity', 1, 100, true);
    if (!product?.isActive || product.stock < item.quantity) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        `${product?.name ?? "A product"} is unavailable in the requested quantity.`,
      );
    }
    numeric(product.price, 'price', 0, 1000000, false);
    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const order = await Order.create({
    userId: request.user._id,
    items,
    phone: request.user.phone,
    shippingAddress: {
      recipientName: `${request.user.firstName} ${request.user.lastName}`,
      ...request.user.address.toObject(),
    },
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
  });
  cart.items = [];
  await cart.save();
  await order.populate(orderPopulation);

  response.status(HttpStatus.CREATED).json({
    success: true,
    message: "Order placed successfully.",
    data: order,
  });
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
  if (request.query.status) {
    if (!orderStatuses.includes(request.query.status)) {
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
  const nextStatus = String(request.body.status ?? "");
  if (!orderStatuses.includes(nextStatus)) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "Order status is invalid.");
  }

  const order = await Order.findById(request.params.id);
  if (!order) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Order was not found.");
  }
  if (!allowedTransitions[order.status].has(nextStatus)) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      `Order cannot move from ${order.status} to ${nextStatus}.`,
    );
  }

  const inventoryDirection =
    order.status === OrderStatus.PENDING && nextStatus === OrderStatus.CONFIRMED
      ? -1
      : order.status === OrderStatus.CONFIRMED && nextStatus === OrderStatus.CANCELLED
        ? 1
        : 0;
  if (inventoryDirection)
    await adjustInventory(order.items, inventoryDirection);

  let updatedOrder;
  try {
    updatedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: { status: nextStatus } },
      { new: true, runValidators: true },
    ).populate(orderPopulation);
  } catch (error) {
    if (inventoryDirection) {
      await adjustInventory(order.items, -inventoryDirection);
    }
    throw error;
  }
  if (!updatedOrder) {
    if (inventoryDirection) {
      await adjustInventory(order.items, -inventoryDirection);
    }
    throw new ApiError(
      HttpStatus.CONFLICT,
      "The order was updated by another request. Refresh and try again.",
    );
  }

  response.status(HttpStatus.OK).json({
    success: true,
    message: `Order marked as ${nextStatus.replaceAll("_", " ")}.`,
    data: updatedOrder,
  });
});
