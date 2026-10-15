// @ts-check
import { isPrice, isStock } from './numbers.js';

/** @typedef {{productRef?: string, productId?: {_id?: string, name?: string, isActive?: boolean, price?: number, stock?: number} | null, quantity: number}} CartItem */

/** @param {CartItem} item */
export const cartItemId = item => String(item.productRef ?? item.productId?._id ?? '');

/** @param {CartItem} item */
export function canCheckoutItem(item) {
  const product = item.productId;
  return Boolean(cartItemId(item) && product?.isActive && isPrice(product.price)
    && isStock(product.stock) && Number.isInteger(item.quantity)
    && item.quantity >= 1 && item.quantity <= 100 && item.quantity <= /** @type {number} */ (product.stock));
}

/** @param {CartItem[]} items @param {string[]} selectedIds */
export function selectedCartItems(items, selectedIds) {
  const selected = new Set(selectedIds);
  return items.filter(item => selected.has(cartItemId(item)) && canCheckoutItem(item));
}

/** Sum integer cents so the preview matches the server's order snapshots.
 * @param {CartItem[]} items */
export const selectedCartTotal = items => items.reduce((sum, item) =>
  sum + Math.round(/** @type {number} */ (item.productId?.price) * 100) * item.quantity, 0) / 100;
