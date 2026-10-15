import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
process.env.NODE_ENV = 'test';
process.env.CLOUDINARY_CLOUD_NAME = 'unit-test';
process.env.CLOUDINARY_API_KEY = 'unit-test';
process.env.CLOUDINARY_API_SECRET = 'unit-test';
process.env.MONGOMS_DOWNLOAD_DIR = resolve('node_modules/.cache/mongodb-binaries');
const { default: Product } = await import('../models/productModel.js');
const { default: Cart } = await import('../models/cartModel.js');
const { default: Order } = await import('../models/orderModel.js');
const { default: User } = await import('../models/userModel.js');
const { default: Session } = await import('../models/sessionModel.js');
const { checkoutCart, transitionOrder } = await import('../controllers/orderController.js');
const { getCart, mutateCart } = await import('../controllers/cartController.js');
const { issueAccessToken, hashToken } = await import('../utils/token.js');
const { authenticate } = await import('../middleware/authentication.js');
const { validateBody } = await import('../utils/validation.js');
const { recordFailure, findAttempt } = await import('../models/loginAttemptModel.js');
const { default: app } = await import('../app.js');
const { default: Category } = await import('../models/categoryModel.js');
const { default: Review } = await import('../models/reviewModel.js');
const { default: Job } = await import('../models/mediaCleanupJobModel.js');
const { default: cloudinary } = await import('../config/cloudinary.js');
const { scheduleCleanup, retryCleanupBatch } = await import('../utils/mediaCleanup.js');
let replica;
let server;
let baseUrl;
before(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  // Only the generated loopback test URI is ever passed to mongoose.
  await mongoose.connect(replica.getUri(), { dbName: 'isolatedAuditTest' });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => { if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await mongoose.disconnect(); if (replica) await replica.stop(); });
const contact = { phone: '09123456789', shippingAddress: { recipientName: 'Test Buyer', street: 'Main St', city: 'Manila', province: 'Metro Manila', postalCode: '1000' } };
async function fixture() {
  const userId = String(new mongoose.Types.ObjectId());
  const product = await Product.create({ name: `Item ${randomUUID()}`, sku: randomUUID(), price: 10.25, stock: 100, categoryId: new mongoose.Types.ObjectId() });
  const cart = await mutateCart(userId, 'add', String(product._id), 2);
  return { userId, product, cart };
}
test('price zero, negative, fractions and non-finite values are rejected at request and schema boundaries', async () => {
  for (const price of [0, -1, 0.001, Infinity, NaN]) {
    assert.throws(() => validateBody('/products/x', 'PATCH', { price }));
    const product = new Product({ name: 'Invalid', sku: 'INVALID', price, stock: 1, categoryId: new mongoose.Types.ObjectId() });
    await assert.rejects(product.validate());
  }
});
test('parallel checkout replay creates one order and clears one cart', async () => {
  const { userId, cart } = await fixture(); const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 3 }, () => checkoutCart(userId, key, String(cart._id), cart.revision, contact)));
  assert.equal(new Set(results.map(order => String(order._id))).size, 1);
  assert.equal(await Order.countDocuments({ userId }), 1);
  assert.equal((await getCart(userId)).items.length, 0);
});
test('different keys cannot consume the same cart twice', async () => {
  const { userId, cart } = await fixture();
  const results = await Promise.allSettled(Array.from({ length: 2 }, () => checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(await Order.countDocuments({ userId }), 1);
});

test('selected checkout keeps unselected products and ignores their unavailable stock', async () => {
  const { userId, product, cart } = await fixture();
  const other = await Product.create({ name: randomUUID(), sku: randomUUID(), price: 9.99, stock: 2, categoryId: new mongoose.Types.ObjectId() });
  const updated = await mutateCart(userId, 'add', String(other._id), 1);
  await Product.updateOne({ _id: other._id }, { $set: { stock: 0 } });
  const selection = [String(product._id)];
  const key = randomUUID();
  const order = await checkoutCart(userId, key, String(cart._id), updated.revision, contact, selection);
  assert.equal(order.items.length, 1);
  assert.equal(String(order.items[0].productId), String(product._id));
  assert.equal(order.items[0].sku, product.sku);
  assert.equal(order.totalAmount, 20.5);
  const remaining = await getCart(userId);
  assert.equal(remaining.items.length, 1);
  assert.equal(String(remaining.items[0].productId), String(other._id));
  assert.equal(remaining.revision, updated.revision + 1);
  await transitionOrder(String(order._id), 'confirmed');
  assert.equal((await Product.findById(product._id)).stock, 98);
  assert.equal((await Product.findById(other._id)).stock, 0);
  await transitionOrder(String(order._id), 'cancelled');
  assert.equal((await Product.findById(product._id)).stock, 100);
  const replay = await checkoutCart(userId, key, String(cart._id), updated.revision, contact, selection);
  assert.equal(String(replay._id), String(order._id));
  assert.equal((await getCart(userId)).items.length, 1);
  await assert.rejects(checkoutCart(userId, key, String(cart._id), updated.revision, contact, [String(other._id)]), { statusCode: 409 });
  await Product.updateOne({ _id: other._id }, { $set: { stock: 2 } });
  const next = await checkoutCart(userId, randomUUID(), String(cart._id), remaining.revision, contact, [String(other._id)]);
  assert.equal(next.totalAmount, 9.99);
  assert.equal((await getCart(userId)).items.length, 0);
});

test('checkout rejects products outside the owned cart without changing it', async () => {
  const { userId, cart } = await fixture();
  const outsider = new mongoose.Types.ObjectId();
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact, [String(outsider)]), { statusCode: 409 });
  assert.equal((await getCart(userId)).items.length, 1);
  assert.equal(await Order.countDocuments({ userId }), 0);
});

test('concurrent selected checkout replays one order and retains the other cart line', async () => {
  const { userId, cart, product } = await fixture();
  const other = await Product.create({ name: randomUUID(), sku: randomUUID(), price: 4, stock: 10, categoryId: new mongoose.Types.ObjectId() });
  const updated = await mutateCart(userId, 'add', String(other._id), 1);
  const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 3 }, () => checkoutCart(userId, key, String(cart._id), updated.revision, contact, [String(product._id)])));
  assert.equal(new Set(results.map(order => String(order._id))).size, 1);
  assert.equal(await Order.countDocuments({ userId }), 1);
  assert.equal((await getCart(userId)).items.length, 1);
});

test('a failed selected order restores all cart lines and its revision', async () => {
  const { userId, cart, product } = await fixture();
  const other = await Product.create({ name: randomUUID(), sku: randomUUID(), price: 4, stock: 10, categoryId: new mongoose.Types.ObjectId() });
  const updated = await mutateCart(userId, 'add', String(other._id), 1);
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), updated.revision, { ...contact, phone: 'invalid' }, [String(product._id)]));
  const remaining = await getCart(userId);
  assert.equal(remaining.items.length, 2);
  assert.equal(remaining.revision, updated.revision);
  assert.equal(await Order.countDocuments({ userId }), 0);
});

test('selected checkout rejects an unavailable selected item and a stale revision', async () => {
  const { userId, cart, product } = await fixture();
  const updated = await mutateCart(userId, 'add', String(product._id), 1);
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact, [String(product._id)]), { statusCode: 409 });
  await Product.updateOne({ _id: product._id }, { $set: { isActive: false } });
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), updated.revision, contact, [String(product._id)]), { statusCode: 409 });
  assert.equal((await getCart(userId)).items[0].quantity, 3);
});
test('concurrent additions preserve all quantities and reject stale checkout', async () => {
  const { userId, cart, product } = await fixture();
  await Promise.all(Array.from({ length: 4 }, () => mutateCart(userId, 'add', String(product._id), 1)));
  assert.equal((await getCart(userId)).items[0].quantity, 6);
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact), { statusCode: 409 });
});
test('inventory confirmation and cancellation are atomic and idempotent', async () => {
  const { userId, cart, product } = await fixture();
  const order = await checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact);
  await Promise.all([transitionOrder(String(order._id), 'confirmed'), transitionOrder(String(order._id), 'confirmed')]);
  assert.equal((await Product.findById(product._id)).stock, 98);
  await transitionOrder(String(order._id), 'cancelled');
  assert.equal((await Product.findById(product._id)).stock, 100);
});
test('failed order creation rolls back cart consumption', async () => {
  const { userId, cart } = await fixture();
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, { ...contact, phone: 'invalid' }));
  assert.equal((await getCart(userId)).items.length, 1);
  assert.equal(await Order.countDocuments({ userId }), 0);
});
test('legacy zero-priced records cannot be ordered', async () => {
  const { userId, cart, product } = await fixture();
  await Product.collection.updateOne({ _id: product._id }, { $set: { price: 0 } });
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact), { statusCode: 409 });
});
function authenticateToken(token) {
  return new Promise((resolve, reject) => authenticate({ get: () => `Bearer ${token}` }, {}, error => error ? reject(error) : resolve()));
}
test('logout and password version changes revoke previously issued tokens', async () => {
  const user = await User.create({ firstName: 'Test', lastName: 'Admin', email: `${randomUUID()}@example.com`, role: 'admin', passwordHash: 'test-password' });
  const token = await issueAccessToken(user);
  await authenticateToken(token);
  await Session.deleteOne({ tokenHash: hashToken(token) });
  await assert.rejects(authenticateToken(token), { statusCode: 401 });
  const second = await issueAccessToken(user);
  await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
  await assert.rejects(authenticateToken(second), { statusCode: 401 });
});
test('unknown emails receive the same persisted failure cooldown', async () => {
  const email = `${randomUUID()}@example.com`;
  for (let i = 0; i < 5; i++) await recordFailure(email, new Date());
  assert.equal((await findAttempt(email)).failedLoginAttempts, 5);
  assert.ok((await findAttempt(email)).loginLockedUntil > new Date());
});
async function request(path, token, method = 'GET', body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, payload: await response.json() };
}
test('HTTP workflow validates checkout, ratings, account lifecycle and password errors', async () => {
  const admin = await User.create({ firstName: 'Audit', lastName: 'Admin', email: `${randomUUID()}@example.com`, role: 'admin', passwordHash: 'test-password' });
  const customer = await User.create({ firstName: 'Audit', lastName: 'Buyer', email: `${randomUUID()}@example.com`, studentNumber: '2023-123456', course: 'Computer Science', yearLevel: '4', passwordHash: 'test-password', phone: contact.phone, address: { street: 'Main St', city: 'Manila', province: 'Metro Manila', postalCode: '1000' } });
  const adminToken = await issueAccessToken(admin), customerToken = await issueAccessToken(customer);
  assert.equal((await request('/products/media-cleanup/retry', customerToken, 'POST')).status, 403);
  assert.equal((await request('/users/me/password', customerToken, 'PATCH', { currentPassword: 'wrong-password', newPassword: 'new-password' })).status, 400);
  assert.equal((await request('/users/me/session', customerToken)).status, 200);
  const category = await Category.create({ name: `Test ${randomUUID()}` });
  const product = await Product.create({ name: `HTTP ${randomUUID()}`, sku: randomUUID(), price: 0.01, stock: 2, categoryId: category._id });
  await Review.create({ productId: product._id, userId: customer._id, rating: 4, content: 'Valid test review content.' });
  const detail = await request(`/products/${product._id}`);
  assert.equal(detail.payload.data.averageRating, 4);
  assert.equal(detail.payload.data.reviewCount, 1);
  const added = await request('/carts/items', customerToken, 'POST', { productId: String(product._id), quantity: 1 });
  assert.equal(added.status, 200);
  const other = await Product.create({ name: `Saved ${randomUUID()}`, sku: randomUUID(), price: 3.5, stock: 5, categoryId: category._id });
  const secondAdded = await request('/carts/items', customerToken, 'POST', { productId: String(other._id), quantity: 2 });
  const body = { cartId: secondAdded.payload.data._id, revision: secondAdded.payload.data.revision, productIds: [String(product._id)] };
  assert.equal((await request('/orders', customerToken, 'POST', body)).status, 400);
  const key = randomUUID();
  const first = await request('/orders', customerToken, 'POST', body, { 'Idempotency-Key': key });
  assert.equal(first.status, 201);
  const remainingCart = await request('/carts', customerToken);
  assert.equal(remainingCart.payload.data.items.length, 1);
  assert.equal(remainingCart.payload.data.items[0].productId._id, String(other._id));
  const allOrders = await request('/orders?page=1&limit=20', adminToken);
  assert.equal(allOrders.status, 200);
  assert.ok(allOrders.payload.data.some(order => order._id === first.payload.data._id));
  const preparedOrder = allOrders.payload.data.find(order => order._id === first.payload.data._id);
  assert.equal(preparedOrder.items[0].productName, product.name);
  assert.equal(preparedOrder.items[0].sku, product.sku);
  assert.equal(preparedOrder.items[0].quantity, 1);
  assert.equal(preparedOrder.phone, contact.phone);
  assert.equal(preparedOrder.shippingAddress.recipientName, 'Audit Buyer');
  const emptyStatus = await request('/orders?status=', adminToken);
  assert.equal(emptyStatus.status, 200);
  for (const status of ['pending', 'confirmed', 'ready_for_claiming', 'claimed', 'cancelled']) {
    const filtered = await request(`/orders?status=${status}`, adminToken);
    assert.equal(filtered.status, 200);
    assert.ok(filtered.payload.data.every(order => order.status === status));
  }
  assert.equal((await request('/orders?status=invalid', adminToken)).status, 400);
  const replay = await request('/orders', customerToken, 'POST', body, { 'Idempotency-Key': key });
  assert.equal(replay.payload.data._id, first.payload.data._id);
  assert.equal((await request(`/categories/${category._id}`, adminToken, 'DELETE')).status, 200);
  assert.equal((await Category.findById(category._id)).isActive, false);
  assert.ok((await Product.findById(product._id).populate('categoryId')).categoryId);
  assert.equal((await request('/users/me/password', customerToken, 'PATCH', { currentPassword: 'test-password', newPassword: 'new-password' })).status, 200);
  assert.equal((await request('/users/me/session', customerToken)).status, 401);
  const refreshed = await User.findById(customer._id).select('+sessionVersion');
  const nextToken = await issueAccessToken(refreshed);
  assert.equal((await request(`/users/${customer._id}`, adminToken, 'DELETE')).status, 200);
  assert.ok((await User.findById(customer._id)).deletedAt);
  assert.equal((await request('/users/me/session', nextToken)).status, 401);
  assert.equal((await request('/users/logout', adminToken, 'POST')).status, 200);
  assert.equal((await request('/users/me/session', adminToken)).status, 401);
});
test('inventory rollback restores the first product if a later item cannot be reserved', async () => {
  const { userId, cart, product } = await fixture();
  const second = await Product.create({ name: randomUUID(), sku: randomUUID(), price: 5, stock: 1, categoryId: new mongoose.Types.ObjectId() });
  const updated = await mutateCart(userId, 'add', String(second._id), 1);
  const order = await checkoutCart(userId, randomUUID(), String(cart._id), updated.revision, contact);
  await Product.updateOne({ _id: second._id }, { $set: { stock: 0 } });
  await assert.rejects(transitionOrder(String(order._id), 'confirmed'), { statusCode: 409 });
  assert.equal((await Product.findById(product._id)).stock, 100);
  assert.equal((await Order.findById(order._id)).status, 'pending');
});
test('cleanup intent survives failures and retry never deletes referenced images', async t => {
  const publicId = `bulldogs-exchange/products/${randomUUID()}`;
  await scheduleCleanup(publicId, 0);
  const product = await Product.create({ name: randomUUID(), sku: randomUUID(), price: 5, stock: 1, categoryId: new mongoose.Types.ObjectId(), imagePublicId: publicId });
  let destroyed = 0;
  t.mock.method(cloudinary.uploader, 'destroy', async () => { destroyed++; return { result: 'ok' }; });
  await retryCleanupBatch();
  assert.equal(destroyed, 0);
  assert.ok(await Job.exists({ publicId }));
  await Product.updateOne({ _id: product._id }, { $unset: { imagePublicId: 1 } });
  await Job.updateOne({ publicId }, { $set: { nextAttemptAt: new Date(0) } });
  await retryCleanupBatch();
  assert.equal(destroyed, 1);
  assert.equal(await Job.exists({ publicId }), null);
});

test('request quotas are shared across store instances', async () => {
  const { RequestQuotaStore } = await import('../utils/requestQuotaStore.js');
  const one = new RequestQuotaStore(60000, 'test'), two = new RequestQuotaStore(60000, 'test');
  const key = randomUUID();
  const counts = await Promise.all([one.increment(key), two.increment(key), one.increment(key)]);
  assert.deepEqual(counts.map(row => row.totalHits).sort(), [1, 2, 3]);
});

test('audit writes are bounded and repetitive throttled traffic is sampled', async () => {
  const { EventEmitter } = await import('node:events');
  const { createAuditLogger } = await import('../middleware/auditLoggerMiddleware.js');
  const pending = [];
  let writes = 0;
  const logger = createAuditLogger(() => { writes++; return new Promise(resolve => pending.push(resolve)); });
  const emit = (path, statusCode) => {
    const response = Object.assign(new EventEmitter(), { statusCode });
    logger({ originalUrl: path, method: 'GET', ip: '127.0.0.1', socket: {} }, response, () => {});
    response.emit('finish');
  };
  emit('/favicon.ico', 404);
  assert.equal(writes, 0);
  for (let i = 0; i < 100; i++) emit('/api/v1/test', 429);
  assert.equal(writes, 1);
  for (let i = 0; i < 100; i++) emit('/api/v1/test', 200);
  assert.equal(writes, 32);
  pending.forEach(resolve => resolve());
  await Promise.resolve();
});

test('active sold-out products stay visible but cannot be added or checked out', async () => {
  const { userId, cart, product } = await fixture();
  await Product.updateOne({ _id: product._id }, { $set: { stock: 0 } });
  const listing = await request(`/products?search=${product.sku}`);
  assert.equal(listing.status, 200);
  assert.equal(listing.payload.pagination.total, 1);
  assert.equal(listing.payload.data[0].stock, 0);
  assert.equal((await request(`/products/${product._id}`)).status, 200);
  await assert.rejects(mutateCart(userId, 'add', String(product._id), 1), { statusCode: 409 });
  await assert.rejects(checkoutCart(userId, randomUUID(), String(cart._id), cart.revision, contact), { statusCode: 409 });
  await Product.updateOne({ _id: product._id }, { $set: { isActive: false } });
  assert.equal((await request(`/products?search=${product.sku}`)).payload.pagination.total, 0);
  assert.equal((await request(`/products/${product._id}`)).status, 404);
});
