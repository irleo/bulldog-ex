import assert from 'node:assert/strict';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import cloudinary, { requireCloudinary } from '../config/cloudinary.js';
import { sanitizeImage } from '../middleware/uploadImageMiddleware.js';

// Explicit live smoke check: uploads a generated image, verifies delivery, then removes it.
// Never creates a product or modifies MongoDB records.
/** @type {import('../controllers/productController.js').ProductImageAsset | undefined} */
let asset;
const publicId = `bulldogs-exchange/products/${randomUUID()}`;
let attempted = false;
try {
  requireCloudinary();
  const source = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#0b1b46' } }).png().toBuffer();
  const buffer = await sanitizeImage(source, 'image/png');
  attempted = true;
  const uploaded = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ public_id: publicId, resource_type: 'image', format: 'webp', overwrite: false, timeout: 30000 }, (error, result) => error ? reject(error) : resolve(result));
    stream.on('error', reject);
    stream.end(buffer);
  });
  asset = { url: uploaded.secure_url, publicId };
  const response = await fetch(asset.url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, 'Cloudinary image should be publicly retrievable.');
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 16);
  console.log('Live Cloudinary upload and image delivery passed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Live image verification failed.');
  process.exitCode = 1;
} finally {
  if (attempted) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
      assert.ok(['ok', 'not found'].includes(result.result));
      console.log('Live test asset removed successfully.');
    } catch (error) {
      console.error('Live test asset cleanup needs a retry:', publicId, error instanceof Error ? error.name : 'CleanupError');
      process.exitCode = 1;
    }
  }
}
