// @ts-check
import Cart from '../models/cartModel.js';
import Product from '../models/productModel.js';
import { isPrice, isStock } from '../utils/numbers.js';

import { ApiError, asyncHandler } from '../middleware/errorHandlers.js';

export const getMyCart = asyncHandler(async (request, response) => {
  response.json({ success: true, data: await serializeCart(await getCart(String(request.user._id))) });
});
/** @param {'add'|'set'|'remove'|'clear'} action @param {string} message */
const changeCart = (action, message) => asyncHandler(async (request, response) => {
  const cart = await mutateCart(String(request.user._id), action,
    String(request.params.productId ?? request.body?.productId ?? ''), request.body?.quantity ?? 1);
  response.json({ success: true, message, data: await serializeCart(cart) });
});
export const addCartItem = changeCart('add', 'Product added to cart.');
export const updateCartItem = changeCart('set', 'Cart quantity updated.');
export const removeCartItem = changeCart('remove', 'Product removed from cart.');
export const clearMyCart = changeCart('clear', 'Cart cleared.');

/** @param {string} userId */
export async function getCart(userId) {
  try {
    return await Cart.findOneAndUpdate({ userId }, { $setOnInsert: { userId, items: [], revision: 0 } },
      { upsert: true, returnDocument: 'after', runValidators: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return Cart.findOne({ userId }).orFail();
    throw error;
  }
}

/** @param {string} userId @param {'add'|'set'|'remove'|'clear'} action @param {string} [productId] @param {number} [quantity] */
export async function mutateCart(userId, action, productId = '', quantity = 1) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const cart = await getCart(userId);
    const items = cart.items.map(item => ({ productId: item.productId, quantity: item.quantity }));
    const index = items.findIndex(item => String(item.productId) === productId);
    if (action === 'add' || action === 'set') {
      if (action === 'set' && index < 0) throw new ApiError(404, 'Cart item was not found.');
      const next = action === 'add' && index >= 0 ? items[index].quantity + quantity : quantity;
      if (!Number.isInteger(next) || next < 1 || next > 100) throw new ApiError(400, 'Quantity must be between 1 and 100.');
      const product = await Product.findById(productId).select('price stock isActive').lean();
      if (!product?.isActive || !isPrice(product.price) || !isStock(product.stock) || product.stock < next) {
        throw new ApiError(409, 'Product is unavailable in the requested quantity or has invalid pricing.');
      }
      if (index >= 0) items[index].quantity = next;
      else {
        if (items.length >= 100) throw new ApiError(400, 'A cart can contain at most 100 products.');
        items.push({ productId: product._id, quantity: next });
      }
    }
    const revision = cart.revision ?? 0;
    const updated = await Cart.findOneAndUpdate({ _id: cart._id,
      ...(revision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision }) },
    { $set: { items: action === 'clear' ? [] : action === 'remove' ? items.filter(item => String(item.productId) !== productId) : items },
      $inc: { revision: 1 } }, { returnDocument: 'after', runValidators: true });
    if (updated) return updated;
  }
  throw new ApiError(409, 'Your cart is changing in another request. Refresh and retry.');
}

/** @param {Awaited<ReturnType<typeof getCart>>} cart */
export async function serializeCart(cart) {
  const refs = cart.items.map(item => String(item.productId));
  await cart.populate({ path: 'items.productId', select: 'name slug sku price stock images supplier isActive' });
  const result = cart.toObject();
  return { ...result, items: result.items.map((item, index) => ({ ...item, productRef: refs[index] })) };
}
