import mongoose from "mongoose";
import { HttpStatus } from "../config/constants.js";
import Cart from "../models/cartModel.js";
import Product from "../models/productModel.js";
import { ApiError, asyncHandler } from "../middleware/errorHandlers.js";

const cartPopulation = {
  path: "items.productId",
  select: "name slug sku price stock images supplier isActive",
};

const parseQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new ApiError(
      HttpStatus.BAD_REQUEST,
      "quantity must be an integer between 1 and 100.",
    );
  }
  return quantity;
};

const requireAvailableProduct = async (productId, quantity) => {
  if (!mongoose.isObjectIdOrHexString(productId)) {
    throw new ApiError(HttpStatus.BAD_REQUEST, "productId is invalid.");
  }
  const product = await Product.findOne({
    _id: productId,
    isActive: true,
  }).lean();
  if (!product) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Product was not found.");
  }
  if (product.stock < quantity) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      `Only ${product.stock} item(s) are available.`,
    );
  }
  return product;
};

const loadCart = (userId) =>
  Cart.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, items: [] } },
    { new: true, upsert: true, runValidators: true },
  ).populate(cartPopulation);

export const getMyCart = asyncHandler(async (request, response) => {
  const cart = await loadCart(request.user._id);
  response.status(HttpStatus.OK).json({ success: true, data: cart });
});

export const addCartItem = asyncHandler(async (request, response) => {
  const productId = String(request.body.productId ?? "");
  const quantity = parseQuantity(request.body.quantity ?? 1);
  await requireAvailableProduct(productId, quantity);

  let cart = await Cart.findOne({ userId: request.user._id });
  if (!cart) cart = new Cart({ userId: request.user._id, items: [] });

  const existingItem = cart.items.find(
    (item) => String(item.productId) === productId,
  );
  if (existingItem) {
    const nextQuantity = parseQuantity(existingItem.quantity + quantity);
    await requireAvailableProduct(productId, nextQuantity);
    existingItem.quantity = nextQuantity;
  } else {
    if (cart.items.length >= 100) throw new ApiError(HttpStatus.BAD_REQUEST, 'A cart can contain at most 100 different products.');
    cart.items.push({ productId, quantity });
  }

  await cart.save();
  await cart.populate(cartPopulation);
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product added to cart.",
    data: cart,
  });
});

export const updateCartItem = asyncHandler(async (request, response) => {
  const quantity = parseQuantity(request.body.quantity);
  await requireAvailableProduct(request.params.productId, quantity);

  const cart = await Cart.findOne({ userId: request.user._id });
  const item = cart?.items.find(
    (entry) => String(entry.productId) === request.params.productId,
  );
  if (!cart || !item) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Cart item was not found.");
  }

  item.quantity = quantity;
  await cart.save();
  await cart.populate(cartPopulation);
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Cart quantity updated.",
    data: cart,
  });
});

export const removeCartItem = asyncHandler(async (request, response) => {
  const cart = await Cart.findOneAndUpdate(
    { userId: request.user._id, "items.productId": request.params.productId },
    { $pull: { items: { productId: request.params.productId } } },
    { new: true, runValidators: true },
  ).populate(cartPopulation);

  if (!cart) {
    throw new ApiError(HttpStatus.NOT_FOUND, "Cart item was not found.");
  }
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Product removed from cart.",
    data: cart,
  });
});

export const clearMyCart = asyncHandler(async (request, response) => {
  const cart = await Cart.findOneAndUpdate(
    { userId: request.user._id },
    { $set: { items: [] } },
    { new: true, upsert: true, runValidators: true },
  ).populate(cartPopulation);

  response.status(HttpStatus.OK).json({
    success: true,
    message: "Cart cleared.",
    data: cart,
  });
});
