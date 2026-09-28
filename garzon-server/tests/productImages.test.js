import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import sharp from 'sharp';
import express from 'express';

// No real account, database, or remote storage is used by these tests.
process.env.CLOUDINARY_CLOUD_NAME = 'unit-test';
process.env.CLOUDINARY_API_KEY = 'unit-test';
process.env.CLOUDINARY_API_SECRET = 'unit-test';
const { sanitizeImage, uploadImageMiddleware, MAX_IMAGE_BYTES } = await import('../middleware/uploadImageMiddleware.js');
const { validateRequest } = await import('../middleware/validationMiddleware.js');
const { serverErrorHandler } = await import('../middleware/errorHandlers.js');
const { default: cloudinary } = await import('../config/cloudinary.js');
const { default: Product } = await import('../models/productModel.js');
const { uploadProductAsset, cleanupProductAsset } = await import('../controllers/productController.js');
const { createProductWithImage, updateProductWithImage } = await import('../controllers/productController.js');
const { validateBody: clientValidateBody } = await import('../../garzon-client/src/utils/validation.js');
const { authorize } = await import('../middleware/authorization.js');
const { default: productRoutes } = await import('../routes/productRoutes.js');
const { default: User } = await import('../models/userModel.js');
const { default: Category } = await import('../models/categoryModel.js');
const { createAccessToken } = await import('../utils/token.js');

const { default: Job } = await import('../models/mediaCleanupJobModel.js');
const { default: Session } = await import('../models/sessionModel.js');
beforeEach(t => {
  t.mock.method(Job, 'updateOne', async () => ({ modifiedCount: 1 }));
  t.mock.method(Job, 'deleteOne', async () => ({ deletedCount: 1 }));
  t.mock.method(Product, 'exists', async () => null);
  t.mock.method(Session, 'exists', async () => ({ _id: 'test-session' }));
});

/** @param {'png'|'jpeg'|'webp'} format */
const fixture = (format = 'png') => sharp({ create: { width: 16, height: 12, channels: 3, background: '#123456' } }).toFormat(format).toBuffer();
const fields = { name: 'Test product', sku: 'TEST-IMG', price: 10, stock: 2, categoryId: '507f1f77bcf86cd799439011' };
const oldId = 'bulldogs-exchange/products/11111111-1111-4111-8111-111111111111';

/** @param {import('node:test').TestContext} t */
function mockStorage(t) {
  /** @type {string[]} */ const destroyed = [];
  /** @type {string[]} */ const uploaded = [];
  t.mock.method(cloudinary.uploader, 'upload_stream', (options, callback) => {
    uploaded.push(options.public_id);
    return new Writable({ write(_chunk, _encoding, done) { done(); }, final(done) {
      callback(undefined, { public_id: options.public_id, secure_url: `https://res.cloudinary.com/unit-test/${options.public_id}.webp` });
      done();
    } });
  });
  t.mock.method(cloudinary.uploader, 'destroy', async (publicId) => {
    destroyed.push(publicId);
    return { result: 'ok' };
  });
  return { destroyed, uploaded };
}

for (const format of ['png', 'jpeg', 'webp']) {
  test(`decodes and re-encodes valid ${format}`, async () => {
    const clean = await sanitizeImage(await fixture(format), `image/${format}`);
    const metadata = await sharp(clean).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 16);
  });
}

test('rejects empty, oversized, disguised, truncated and mismatched images', async () => {
  const png = await fixture();
  for (const buffer of [Buffer.alloc(0), Buffer.alloc(MAX_IMAGE_BYTES + 1), Buffer.from('not an image'), png.subarray(0, 32)]) {
    await assert.rejects(sanitizeImage(buffer, 'image/png'), { statusCode: 400 });
  }
  await assert.rejects(sanitizeImage(png, 'image/jpeg'), { statusCode: 400 });
});

test('strips trailing non-image payloads', async () => {
  const png = await fixture();
  const clean = await sanitizeImage(Buffer.concat([png, Buffer.from('<script>evil()</script>')]), 'image/png');
  assert.equal(clean.includes(Buffer.from('<script>')), false);
});

test('rejects images exceeding the pixel budget', async () => {
  const large = await sharp({ create: { width: 5000, height: 4001, channels: 3, background: '#000' } }).png().toBuffer();
  await assert.rejects(sanitizeImage(large, 'image/png'), { statusCode: 400 });
});

test('client validation allows image-only endpoint without permitting metadata injection', () => {
  const path = '/products/507f1f77bcf86cd799439011/upload-image';
  assert.deepEqual(clientValidateBody(path, 'POST', {}, true), {});
  assert.throws(() => clientValidateBody(path, 'POST', { imagePublicId: oldId }, true));
});

test('replacement commits before deleting the old asset and checks its previous state', async (t) => {
  const { destroyed, uploaded } = mockStorage(t);
  const previous = new Product({ ...fields, images: ['/uploads/products/legacy.png'], imagePublicId: oldId });
  t.mock.method(Product, 'findById', () => ({ select: async () => previous }));
  t.mock.method(Product, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.imagePublicId, oldId);
    assert.deepEqual(filter.images, ['/uploads/products/legacy.png']);
    assert.deepEqual(destroyed, []);
    return new Product({ ...fields, ...update.$set });
  });
  const { product, warning } = await updateProductWithImage(String(previous._id), {}, await fixture());
  assert.equal(warning, undefined);
  assert.equal(product.images.length, 1);
  assert.deepEqual(destroyed, [oldId]);
  assert.equal(uploaded.length, 1);
});

test('a concurrent replacement cleans only its rejected new asset', async (t) => {
  const { destroyed, uploaded } = mockStorage(t);
  const previous = new Product({ ...fields, images: ['old'], imagePublicId: oldId });
  t.mock.method(Product, 'findById', () => ({ select: async () => previous }));
  t.mock.method(Product, 'findOneAndUpdate', async () => null);
  await assert.rejects(updateProductWithImage(String(previous._id), {}, await fixture()), { statusCode: 409 });
  assert.deepEqual(destroyed, uploaded);
  assert.equal(destroyed.includes(oldId), false);
});

test('duplicate SKU cleans the upload without hiding the database error', async (t) => {
  const { destroyed, uploaded } = mockStorage(t);
  const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
  t.mock.method(Product.prototype, 'save', async () => { throw duplicate; });
  await assert.rejects(createProductWithImage(fields, await fixture()), (error) => error === duplicate);
  assert.deepEqual(destroyed, uploaded);
});

test('ambiguous database failures retain the asset for reconciliation', async (t) => {
  const { destroyed } = mockStorage(t);
  t.mock.method(console, 'error', () => undefined);
  t.mock.method(Product.prototype, 'save', async () => { throw new Error('connection lost'); });
  await assert.rejects(createProductWithImage(fields, await fixture()), /connection lost/);
  assert.deepEqual(destroyed, []);
});

test('updates without a file preserve existing images without Cloudinary calls', async (t) => {
  const { uploaded, destroyed } = mockStorage(t);
  const previous = new Product({ ...fields, images: ['legacy'] });
  t.mock.method(Product, 'findById', () => ({ select: async () => previous }));
  t.mock.method(Product, 'findOneAndUpdate', async (_filter, update) => {
    assert.equal('images' in update.$set, false);
    assert.equal('imagePublicId' in update.$set, false);
    return previous;
  });
  await updateProductWithImage(String(previous._id), { stock: 3 }, undefined);
  assert.deepEqual(uploaded, []);
  assert.deepEqual(destroyed, []);
});

test('missing product does not upload a file', async (t) => {
  const { uploaded } = mockStorage(t);
  t.mock.method(Product, 'findById', () => ({ select: async () => null }));
  await assert.rejects(updateProductWithImage('507f1f77bcf86cd799439011', {}, await fixture()), { statusCode: 404 });
  assert.deepEqual(uploaded, []);
});

test('cleanup failure returns a warning and logs a recoverable public ID', async (t) => {
  mockStorage(t);
  const log = t.mock.method(console, 'error', () => undefined);
  t.mock.method(cloudinary.uploader, 'destroy', async () => { throw new Error('remote down'); });
  assert.match(await cleanupProductAsset(oldId), /unused image/);
  assert.equal(log.mock.calls[0].arguments[1].publicId, oldId);
});

test('upload failure returns a safe gateway error', async (t) => {
  mockStorage(t);
  t.mock.method(console, 'error', () => undefined);
  t.mock.method(cloudinary.uploader, 'upload_stream', () => { throw new Error('secret provider detail'); });
  await assert.rejects(uploadProductAsset(await fixture()), { statusCode: 502, message: 'Image storage could not accept the upload. Please try again.' });
});

test('multipart middleware validates image-only requests and rejects excess files and fields', async (t) => {
  const app = express();
  app.use(validateRequest);
  app.post('/api/v1/products/:id/upload-image', uploadImageMiddleware, (req, res) => res.json({ size: req.file?.size }));
  app.use(serverErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/v1/products/507f1f77bcf86cd799439011/upload-image`;
  const png = await fixture();
  const valid = new FormData();
  valid.append('image', new Blob([png], { type: 'image/png' }), 'test.png');
  assert.equal((await fetch(url, { method: 'POST', body: valid })).status, 200);
  valid.append('image', new Blob([png], { type: 'image/png' }), 'second.png');
  assert.equal((await fetch(url, { method: 'POST', body: valid })).status, 400);
  const injected = new FormData();
  injected.append('imagePublicId', oldId);
  assert.equal((await fetch(url, { method: 'POST', body: injected })).status, 400);
  const oversized = new FormData();
  oversized.append('image', new Blob([Buffer.alloc(MAX_IMAGE_BYTES + 1)], { type: 'image/png' }), 'large.png');
  const response = await fetch(url, { method: 'POST', body: oversized });
  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /5 MB/);
});

test('existing RBAC rejects a customer for admin media operations', () => {
  let failure;
  authorize('admin')({ user: { role: 'customer' } }, {}, (error) => { failure = error; });
  assert.equal(failure.statusCode, 403);
});

test('real product routes enforce auth and support create, update and dedicated uploads', async (t) => {
  const { uploaded } = mockStorage(t);
  const previous = new Product({ ...fields, images: ['legacy'] });
  const account = { _id: previous._id, role: 'admin', isActive: true };
  t.mock.method(User, 'findById', () => ({ select: async () => account }));
  t.mock.method(Category, 'exists', async () => ({ _id: fields.categoryId }));
  t.mock.method(Product, 'findById', () => ({ select: async () => previous }));
  t.mock.method(Product, 'findOneAndUpdate', async (_filter, update) => new Product({ ...fields, ...update.$set }));
  t.mock.method(Product.prototype, 'save', async function () { return this; });
  t.mock.method(Product.prototype, 'populate', async function () { return this; });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/products', productRoutes);
  app.use(serverErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/products`;
  const imageUrl = `${base}/${previous._id}/upload-image`;
  const headers = { Authorization: `Bearer ${createAccessToken(account)}` };
  const png = await fixture();
  const imageForm = () => {
    const form = new FormData();
    form.append('image', new Blob([png], { type: 'image/png' }), 'product.png');
    return form;
  };
  assert.equal((await fetch(imageUrl, { method: 'POST', body: imageForm() })).status, 401);
  account.role = 'customer';
  assert.equal((await fetch(imageUrl, { method: 'POST', body: imageForm(), headers })).status, 403);
  assert.equal(uploaded.length, 0);
  account.role = 'admin';
  assert.equal((await fetch(`${base}/invalid/upload-image`, { method: 'POST', body: imageForm(), headers })).status, 400);
  assert.equal((await fetch(imageUrl, { method: 'POST', body: new FormData(), headers })).status, 400);
  const create = imageForm();
  for (const [key, value] of Object.entries(fields)) create.set(key, String(value));
  const created = await fetch(base, { method: 'POST', body: create, headers });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.match(createdBody.data.images[0], /^https:\/\/res.cloudinary.com/);
  assert.equal(createdBody.data.imagePublicId, undefined);
  assert.equal((await fetch(`${base}/${previous._id}`, { method: 'PATCH', body: imageForm(), headers })).status, 200);
  assert.equal((await fetch(imageUrl, { method: 'POST', body: imageForm(), headers })).status, 200);
  assert.equal(uploaded.length, 3);
});
