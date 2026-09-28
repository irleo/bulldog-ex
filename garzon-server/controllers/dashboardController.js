// @ts-check
import { asyncHandler } from '../middleware/errorHandlers.js';
import { retryCleanupBatch } from '../utils/mediaCleanup.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Job from '../models/mediaCleanupJobModel.js';
/** @param {Date} [now] */
export async function getDashboard(now = new Date()) {
  const since = new Date(now.getTime() - 7 * 86400000);
  const paid = { paymentStatus: 'paid', status: { $ne: 'cancelled' }, createdAt: { $gte: since, $lte: now }, totalAmount: { $gt: 0 } };
  const [products, customers, pendingOrders, paidSummary, daily, topProducts, cleanupPending] = await Promise.all([
    Product.countDocuments({ isActive: true }), User.countDocuments({ role: 'customer', deletedAt: null }), Order.countDocuments({ status: 'pending' }),
    Order.aggregate([{ $match: paid }, { $group: { _id: null, amount: { $sum: '$totalAmount' }, orders: { $sum: 1 } } }, { $limit: 1 }]),
    Order.aggregate([{ $match: paid }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Manila' } }, amount: { $sum: '$totalAmount' } } }, { $sort: { _id: 1 } }, { $limit: 8 }]),
    Order.aggregate([{ $match: paid }, { $unwind: '$items' }, { $group: { _id: '$items.sku', name: { $first: '$items.productName' }, quantity: { $sum: '$items.quantity' } } }, { $sort: { quantity: -1, _id: 1 } }, { $limit: 6 }]),
    Job.countDocuments({ nextAttemptAt: { $lte: now } }),
  ]);
  return { since, until: now, products, customers, pendingOrders, paidAmount: paidSummary[0]?.amount ?? 0, paidOrders: paidSummary[0]?.orders ?? 0, daily, topProducts, cleanupPending };
}

export const getDashboardMetrics = asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await getDashboard() });
});
export const retryMediaCleanup = asyncHandler(async (_request, response) => {
  response.json({ success: true, data: await retryCleanupBatch() });
});
